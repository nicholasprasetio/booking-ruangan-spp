import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { parsePagination } from '../../../utils/pagination'
import {
  buildAvailabilitySlots,
  buildRequestedSlotIsos,
  buildRequestedSlots,
  ensurePublicBookingLeadTime,
  mergeAvailabilitySlots,
  normalizeText,
  requireTime,
  requireYmd,
  toIsoForJakartaDateTime,
  type RoomForBooking,
} from '../../../utils/external-booking'

type AvailabilityStatus = 'full' | 'partial' | 'unavailable'

type CandidateRoom = RoomForBooking & {
  availability_status: AvailabilityStatus
  available_ranges: Array<{ startTime: string; endTime: string }>
  requested_range_available: boolean | null
  selected_slots: string[]
  selected_slot_isos: string[]
}

function addDaysToYmd(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && aEnd > bStart
}

function rangeCoversRequest(ranges: Array<{ startTime: string; endTime: string }>, startTime: string, endTime: string): boolean {
  return ranges.some((range) => range.startTime <= startTime && range.endTime >= endTime)
}

function isFalseParam(value: unknown): boolean {
  return typeof value === 'string' && ['0', 'false', 'no', 'tidak'].includes(value.trim().toLowerCase())
}

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const q = getQuery(event)
  const { page, pageSize } = parsePagination(q)
  const date = normalizeText(q.date)
  const startTime = normalizeText(q.startTime)
  const endTime = normalizeText(q.endTime)
  const search = normalizeText(q.search)
  const roomId = Number(normalizeText(q.roomId))
  const includeUnavailable = !isFalseParam(q.includeUnavailable)
  const hasStart = Boolean(startTime)
  const hasEnd = Boolean(endTime)
  const hasRequestedRange = hasStart && hasEnd

  requireYmd(date)
  if (hasStart !== hasEnd) {
    throw createError({ statusCode: 400, statusMessage: 'Isi jam mulai dan selesai, atau kosongkan keduanya' })
  }
  if (hasRequestedRange) {
    requireTime(startTime, 'startTime')
    requireTime(endTime, 'endTime')
  }
  await ensurePublicBookingLeadTime(env.DB, date)

  const startIso = hasRequestedRange ? toIsoForJakartaDateTime(date, startTime) : toIsoForJakartaDateTime(date, '00:00')
  const endIso = hasRequestedRange ? toIsoForJakartaDateTime(date, endTime) : toIsoForJakartaDateTime(addDaysToYmd(date, 1), '00:00')
  if (hasRequestedRange && endIso <= startIso) {
    throw createError({ statusCode: 400, statusMessage: 'Jam selesai harus setelah jam mulai' })
  }

  const conditions = ['deleted_at IS NULL']
  const binds: unknown[] = []
  if (!includeUnavailable) {
    conditions.push('COALESCE(available_for_booking, 1) = 1')
  }
  if (Number.isFinite(roomId) && roomId > 0) {
    conditions.push('id = ?')
    binds.push(roomId)
  }
  if (search) {
    conditions.push('(name LIKE ? OR location LIKE ? OR description LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  const roomsRes = await env.DB
    .prepare(
      `SELECT id, name, location, capacity, description, open_time_start, open_time_end, slot_minutes,
              COALESCE(available_for_booking, 1) AS available_for_booking
       FROM rooms
       WHERE ${conditions.join(' AND ')}
       ORDER BY id ASC
       LIMIT 1000`,
    )
    .bind(...binds)
      .all<RoomForBooking>()

  const candidateRooms = (roomsRes.results || []).filter((room) => {
    if (room.available_for_booking === 0 || room.available_for_booking === false) {
      return includeUnavailable
    }
    try {
      buildAvailabilitySlots({ date, startTime: hasRequestedRange ? startTime : undefined, endTime: hasRequestedRange ? endTime : undefined, room })
      return true
    } catch {
      return false
    }
  })

  const roomIds = candidateRooms.map((room) => Number(room.id))
  const conflictsByRoom = new Map<number, Array<{ start_at: string; end_at: string }>>()
  if (roomIds.length) {
    for (let i = 0; i < roomIds.length; i += 98) {
      const chunk = roomIds.slice(i, i + 98)
      const placeholders = chunk.map((_, idx) => `?${idx + 3}`).join(', ')
      const conflicts = await env.DB
        .prepare(
          `SELECT b.room_id, bos.start_at, bos.end_at
           FROM booking_occurrence_slots bos
           JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
           JOIN bookings b ON b.id = bo.booking_id
           WHERE b.deleted_at IS NULL
             AND bo.status IN ('pending','approved')
             AND bos.start_at < ?2
             AND bos.end_at > ?1
             AND b.room_id IN (${placeholders})`,
        )
        .bind(startIso, endIso, ...chunk)
        .all<{ room_id: number; start_at: string; end_at: string }>()

      for (const row of conflicts.results || []) {
        const roomConflicts = conflictsByRoom.get(Number(row.room_id)) || []
        roomConflicts.push({ start_at: row.start_at, end_at: row.end_at })
        conflictsByRoom.set(Number(row.room_id), roomConflicts)
      }
    }
  }

  const roomsWithAvailability: CandidateRoom[] = candidateRooms
    .map((room) => {
      if (room.available_for_booking === 0 || room.available_for_booking === false) {
        return {
          ...room,
          availability_status: 'unavailable',
          available_ranges: [],
          requested_range_available: hasRequestedRange ? false : null,
          selected_slots: [],
          selected_slot_isos: [],
        }
      }

      const slots = buildAvailabilitySlots({ date, startTime: hasRequestedRange ? startTime : undefined, endTime: hasRequestedRange ? endTime : undefined, room })
      const conflicts = conflictsByRoom.get(Number(room.id)) || []
      const availableSlots = slots.filter((slot) => !conflicts.some((conflict) => overlaps(slot.startIso, slot.endIso, conflict.start_at, conflict.end_at)))
      const availableRanges = mergeAvailabilitySlots(availableSlots)
      let selectedSlots: string[] = []
      let selectedSlotIsos: string[] = []
      let requestedRangeAvailable: boolean | null = null
      let availabilityStatus: AvailabilityStatus = availableRanges.length ? 'partial' : 'unavailable'

      if (hasRequestedRange) {
        requestedRangeAvailable = rangeCoversRequest(availableRanges, startTime, endTime)
        if (requestedRangeAvailable) {
          availabilityStatus = 'full'
          selectedSlots = buildRequestedSlots({ roomId: Number(room.id), date, startTime, endTime, room })
          selectedSlotIsos = buildRequestedSlotIsos({ roomId: Number(room.id), date, startTime, endTime, room })
        }
      } else if (availableRanges.length) {
        availabilityStatus = 'partial'
      }

      return {
        ...room,
        availability_status: availabilityStatus,
        available_ranges: availableRanges,
        requested_range_available: requestedRangeAvailable,
        selected_slots: selectedSlots,
        selected_slot_isos: selectedSlotIsos,
      }
    })
    .filter((room) => includeUnavailable || room.availability_status !== 'unavailable')
    .sort((a, b) => {
      const rank: Record<AvailabilityStatus, number> = { full: 0, partial: 1, unavailable: 2 }
      const byRank = rank[a.availability_status] - rank[b.availability_status]
      if (byRank !== 0) return byRank
      return String(a.name || a.id).localeCompare(String(b.name || b.id))
    })

  const total = roomsWithAvailability.length
  const offset = (page - 1) * pageSize
  const pagedRooms = roomsWithAvailability.slice(offset, offset + pageSize)
  const pagedIds = pagedRooms.map((room) => Number(room.id))

  const photosByRoom = new Map<number, Array<{ id: number; url: string; thumbnailUrl: string; created_at: string | null }>>()
  if (pagedIds.length) {
    const placeholders = pagedIds.map(() => '?').join(', ')
    const photos = await env.DB
      .prepare(
        `SELECT id, room_id, created_at
         FROM room_photos
         WHERE deleted_at IS NULL
           AND room_id IN (${placeholders})
         ORDER BY created_at DESC`,
      )
      .bind(...pagedIds)
      .all<{ id: number; room_id: number; created_at: string | null }>()

    for (const photo of photos.results || []) {
      const list = photosByRoom.get(Number(photo.room_id)) || []
      list.push({

        id: Number(photo.id),

        url: `/api/rooms/photos/${photo.id}`,

        thumbnailUrl: `/api/rooms/photos/${photo.id}/thumbnail`,

        created_at: photo.created_at,

      })
      photosByRoom.set(Number(photo.room_id), list)
    }
  }

  return {
    ok: true,
    date,
    startTime: hasRequestedRange ? startTime : null,
    endTime: hasRequestedRange ? endTime : null,
    data: pagedRooms.map((room) => ({
      ...room,
      id: Number(room.id),
      status: room.availability_status === 'unavailable' ? 'unavailable' : 'available',
      selected_slots: room.selected_slots,
      selected_slot_isos: room.selected_slot_isos,
      photos: photosByRoom.get(Number(room.id)) || [],
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
