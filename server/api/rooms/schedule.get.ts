import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { parsePagination } from '../../utils/pagination'

type BookingRow = {
  occurrence_id: number
  booking_status: string | null
  occurrence_status: string | null
  booking_start: string
  booking_end: string
  booking_user_id: number | null
  room_id: number
  booking_id: number
}

type RoomRow = {
  id: number
  name: string | null
  location: string | null
  capacity: number | null
  description: string | null
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking: number | null
}

function toIsoDayRange(dateStr?: string): { dayStart: string; dayEnd: string; label: string } {
  if (!dateStr) {
    const now = new Date()
    const y = now.getUTCFullYear()
    const m = String(now.getUTCMonth() + 1).padStart(2, '0')
    const d = String(now.getUTCDate()).padStart(2, '0')
    dateStr = `${y}-${m}-${d}`
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date (expected YYYY-MM-DD)' })
  }
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const startIso = dayStart.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endIso = dayEnd.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return { dayStart: startIso, dayEnd: endIso, label: dateStr }
}

function isActive(nowIso: string, start: string, end: string): boolean {
  return start <= nowIso && nowIso < end
}

function isFalseParam(value: unknown): boolean {
  return typeof value === 'string' && ['0', 'false', 'no', 'tidak'].includes(value.trim().toLowerCase())
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const env = getCloudflareEnv(event)

  const q = getQuery(event)
  const { page, pageSize, offset } = parsePagination(q)
  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const includeUnavailable = !isFalseParam(q.includeUnavailable)
  const { dayStart, dayEnd, label } = toIsoDayRange(typeof q.date === 'string' ? q.date : undefined)
  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')

  const conditions: string[] = ['deleted_at IS NULL']
  const binds: unknown[] = []
  if (!includeUnavailable) {
    conditions.push('COALESCE(available_for_booking, 1) = 1')
  }
  if (search) {
    conditions.push('name LIKE ?')
    binds.push(`%${search}%`)
  }
  const whereSql = conditions.join(' AND ')

  const roomsRes = await env.DB
    .prepare(
      `SELECT id, name, location, capacity, description, open_time_start, open_time_end, slot_minutes,
              COALESCE(available_for_booking, 1) AS available_for_booking
       FROM rooms
       WHERE ${whereSql}
       ORDER BY id ASC
       LIMIT 1000`,
    )
    .bind(...binds)
    .all<RoomRow>()

  if (roomsRes.results.length === 0) {
    return {
      ok: true,
      date: label,
      dayStart,
      dayEnd,
      now: nowIso,
      data: [],
      meta: {
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      },
    }
  }

  const roomIds = roomsRes.results.map((room) => room.id)
  const bookingRows: BookingRow[] = []
  for (let i = 0; i < roomIds.length; i += 98) {
    const chunk = roomIds.slice(i, i + 98)
    const placeholders = chunk.map(() => '?').join(', ')
    const bookingsRes = await env.DB
      .prepare(
        `SELECT
            bo.id as occurrence_id,
            bo.status as occurrence_status,
            b.status as booking_status,
            bos.start_at as booking_start,
            bos.end_at as booking_end,
            b.user_id as booking_user_id,
            COALESCE(bo.room_id, b.room_id) AS room_id,
            b.id as booking_id
         FROM booking_occurrence_slots bos
         JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
         JOIN bookings b ON b.id = bo.booking_id
         WHERE COALESCE(bo.room_id, b.room_id) IN (${placeholders})
           AND b.deleted_at IS NULL
           AND bo.status IN ('pending','approved')
           AND bos.start_at < ?
           AND bos.end_at > ?
         ORDER BY COALESCE(bo.room_id, b.room_id) ASC, bos.start_at ASC`,
      )
      .bind(...chunk, dayEnd, dayStart)
      .all<BookingRow>()
    bookingRows.push(...(bookingsRes.results || []))
  }

  const photosByRoom = new Map<number, Array<{ id: number; url: string; created_at: string | null }>>()
  if (roomIds.length > 0) {
    const photoPlaceholders = roomIds.map(() => '?').join(', ')
    const photos = await env.DB
      .prepare(
        `SELECT id, room_id, object_key, created_at
         FROM room_photos
         WHERE deleted_at IS NULL
           AND room_id IN (${photoPlaceholders})
         ORDER BY created_at DESC`,
      )
      .bind(...roomIds)
      .all<{
        id: number
        room_id: number
        object_key: string
        created_at: string | null
      }>()

    for (const photo of photos.results) {
      const list = photosByRoom.get(photo.room_id) || []
      list.push({
        id: photo.id,
        url: `/api/rooms/photos/${photo.id}`,
        created_at: photo.created_at,
      })
      photosByRoom.set(photo.room_id, list)
    }
  }

  const byRoom = new Map<number, {
    id: number
    name: string | null
    location: string | null
    capacity: number | null
    description: string | null
    open_time_start: string | null
    open_time_end: string | null
    slot_minutes: number | null
    available_for_booking: number | null
    photos: Array<{ id: number; url: string; created_at: string | null }>
    bookings: any[]
  }>()

  for (const room of roomsRes.results) {
    byRoom.set(room.id, {
      id: room.id,
      name: room.name,
      location: room.location,
      capacity: room.capacity,
      description: room.description,
      open_time_start: room.open_time_start,
      open_time_end: room.open_time_end,
      slot_minutes: room.slot_minutes,
      available_for_booking: room.available_for_booking,
      photos: photosByRoom.get(room.id) || [],
      bookings: [],
    })
  }

  for (const row of bookingRows) {
    const target = byRoom.get(row.room_id)
    if (!target) continue
    target.bookings.push({
      id: row.occurrence_id,
      bookingId: row.booking_id,
      status: row.occurrence_status || row.booking_status,
      start: row.booking_start,
      end: row.booking_end,
      userId: row.booking_user_id,
      isActive: isActive(nowIso, row.booking_start, row.booking_end),
    })
  }

  const rooms = Array.from(byRoom.values()).map((room) => {
    const active = room.bookings.find((b) => b.isActive) || null
    const bookable = room.available_for_booking !== 0 && room.available_for_booking !== false
    const status = !bookable ? 'unavailable' : active ? 'occupied' : room.bookings.length ? 'booked' : 'available'
    return { ...room, status, active }
  })
  const visibleRooms = includeUnavailable ? rooms : rooms.filter((room) => room.status === 'available')
  const total = visibleRooms.length
  const pagedRooms = visibleRooms.slice(offset, offset + pageSize)

  return {
    ok: true,
    date: label,
    dayStart,
    dayEnd,
    now: nowIso,
    data: pagedRooms,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
