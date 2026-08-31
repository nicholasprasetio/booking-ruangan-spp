import { createError } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import { buildSlotStartIsosForDate, toIsoNoMs, toMinutes } from './booking-slots'
import { nowIso, recalculateBookingSummary } from './booking-v2'
import { addDaysToYmd, getBookingMinLeadDays, jakartaTodayYmd } from './settings'

export type RoomBookingInput = {
  roomId: number
  date: string
  startTime: string
  endTime: string
}

export type RoomForBooking = {
  id: number
  name: string | null
  location: string | null
  capacity: number | null
  description: string | null
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking?: number | boolean | null
}

export type AvailabilitySlot = {
  startTime: string
  endTime: string
  startIso: string
  endIso: string
  startMin: number
  endMin: number
}

export type AvailableRange = {
  startTime: string
  endTime: string
}

export function normalizeText(input: unknown): string {
  return typeof input === 'string' ? input.trim() : ''
}

export function requireYmd(value: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date (expected YYYY-MM-DD)' })
  }
}

export function requireTime(value: string, label = 'time'): void {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label} (expected HH:MM)` })
  }
  const minutes = toMinutes(value)
  if (!Number.isFinite(minutes) || minutes < 0 || minutes > 24 * 60) {
    throw createError({ statusCode: 400, statusMessage: `Invalid ${label}` })
  }
}

export async function ensurePublicBookingLeadTime(db: D1Database, date: string): Promise<void> {
  const minLeadDays = await getBookingMinLeadDays(db)
  if (minLeadDays <= 0) return

  const minDate = addDaysToYmd(jakartaTodayYmd(), minLeadDays)
  if (date < minDate) {
    throw createError({
      statusCode: 400,
      statusMessage: `Peminjaman harus diajukan minimal ${minLeadDays} hari sebelumnya (tanggal paling cepat ${minDate})`,
    })
  }
}

export async function getRoomForBooking(db: D1Database, roomId: number): Promise<RoomForBooking> {
  const room = await db
    .prepare(
      `SELECT id, name, location, capacity, description, open_time_start, open_time_end, slot_minutes
       FROM rooms
       WHERE id = ?1 AND deleted_at IS NULL AND COALESCE(available_for_booking, 1) = 1
       LIMIT 1`,
    )
    .bind(roomId)
    .first<RoomForBooking>()

  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found or not available for booking' })
  }

  return room
}

export function timeLabelFromMinutes(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0')
  const m = String(minutes % 60).padStart(2, '0')
  return `${h}:${m}`
}

export function toIsoForJakartaDateTime(date: string, time: string): string {
  return new Date(`${date}T${time}:00.000+07:00`).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export function getRoomTimeConfig(room: RoomForBooking): { openStartMin: number; openEndMin: number; slotMinutes: number } {
  const openStartMin = toMinutes(room.open_time_start || '00:00')
  const openEndMin = toMinutes(room.open_time_end || '24:00')
  const slotMinutes = Number(room.slot_minutes || 60)

  if (!Number.isInteger(slotMinutes) || slotMinutes <= 0) {
    throw createError({ statusCode: 400, statusMessage: 'Konfigurasi slot ruangan tidak valid' })
  }
  if (openEndMin <= openStartMin) {
    throw createError({ statusCode: 400, statusMessage: 'Jam operasional ruangan tidak valid' })
  }

  return { openStartMin, openEndMin, slotMinutes }
}

export function buildAvailabilitySlots(input: {
  date: string
  room: RoomForBooking
  startTime?: string
  endTime?: string
}): AvailabilitySlot[] {
  requireYmd(input.date)
  const { openStartMin, openEndMin, slotMinutes } = getRoomTimeConfig(input.room)

  let rangeStartMin = openStartMin
  let rangeEndMin = openEndMin
  if (input.startTime || input.endTime) {
    if (!input.startTime || !input.endTime) {
      throw createError({ statusCode: 400, statusMessage: 'Isi jam mulai dan selesai, atau kosongkan keduanya' })
    }
    requireTime(input.startTime, 'startTime')
    requireTime(input.endTime, 'endTime')
    const startMin = toMinutes(input.startTime)
    const endMin = toMinutes(input.endTime)
    if (endMin <= startMin) {
      throw createError({ statusCode: 400, statusMessage: 'Jam selesai harus setelah jam mulai' })
    }
    rangeStartMin = Math.max(openStartMin, startMin)
    rangeEndMin = Math.min(openEndMin, endMin)
  }

  const slots: AvailabilitySlot[] = []
  for (let min = openStartMin; min + slotMinutes <= openEndMin; min += slotMinutes) {
    const endMin = min + slotMinutes
    if (min < rangeStartMin || endMin > rangeEndMin) continue

    const startTime = timeLabelFromMinutes(min)
    const endTime = timeLabelFromMinutes(endMin)
    slots.push({
      startTime,
      endTime,
      startIso: toIsoForJakartaDateTime(input.date, startTime),
      endIso: toIsoForJakartaDateTime(input.date, endTime),
      startMin: min,
      endMin,
    })
  }

  return slots
}

export function mergeAvailabilitySlots(slots: AvailabilitySlot[]): AvailableRange[] {
  const sorted = [...slots].sort((a, b) => a.startMin - b.startMin)
  const ranges: Array<{ startMin: number; endMin: number }> = []

  for (const slot of sorted) {
    const last = ranges[ranges.length - 1]
    if (last && last.endMin === slot.startMin) {
      last.endMin = slot.endMin
    } else {
      ranges.push({ startMin: slot.startMin, endMin: slot.endMin })
    }
  }

  return ranges.map((range) => ({
    startTime: timeLabelFromMinutes(range.startMin),
    endTime: timeLabelFromMinutes(range.endMin),
  }))
}

export function buildRequestedSlots(input: RoomBookingInput & { room: RoomForBooking }): string[] {
  requireYmd(input.date)
  requireTime(input.startTime, 'startTime')
  requireTime(input.endTime, 'endTime')

  const startMin = toMinutes(input.startTime)
  const endMin = toMinutes(input.endTime)
  if (endMin <= startMin) {
    throw createError({ statusCode: 400, statusMessage: 'Jam selesai harus setelah jam mulai' })
  }

  const { openStartMin, openEndMin, slotMinutes } = getRoomTimeConfig(input.room)

  if (startMin < openStartMin || endMin > openEndMin) {
    throw createError({ statusCode: 400, statusMessage: 'Jam peminjaman di luar jam operasional ruangan' })
  }
  if ((startMin - openStartMin) % slotMinutes !== 0 || (endMin - startMin) % slotMinutes !== 0) {
    throw createError({ statusCode: 400, statusMessage: 'Jam peminjaman harus sesuai interval slot ruangan' })
  }

  const labels: string[] = []
  for (let min = startMin; min < endMin; min += slotMinutes) {
    const h = String(Math.floor(min / 60)).padStart(2, '0')
    const m = String(min % 60).padStart(2, '0')
    labels.push(`${h}:${m}`)
  }

  return labels
}

export function buildRequestedSlotIsos(input: RoomBookingInput & { room: RoomForBooking }): string[] {
  const { openStartMin, openEndMin, slotMinutes } = getRoomTimeConfig(input.room)

  return buildSlotStartIsosForDate({
    ymd: input.date,
    slots: buildRequestedSlots(input),
    openStartMin,
    openEndMin,
    slotMinutes,
  })
}

export async function ensureNoApprovedOrPendingOverlap(
  db: D1Database,
  roomId: number,
  slotStartIsos: string[],
  message = 'Room is not available in the selected slots',
): Promise<void> {
  if (!slotStartIsos.length) return

  for (let i = 0; i < slotStartIsos.length; i += 99) {
    const chunk = slotStartIsos.slice(i, i + 99)
    const placeholders = chunk.map((_, idx) => `?${idx + 2}`).join(', ')
    const overlap = await db
      .prepare(
        `SELECT bos.start_at
         FROM booking_occurrence_slots bos
         JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
         JOIN bookings b ON b.id = bo.booking_id
         WHERE b.room_id = ?1
           AND b.deleted_at IS NULL
           AND bo.status IN ('pending','approved')
           AND bos.start_at IN (${placeholders})
         LIMIT 1`,
      )
      .bind(roomId, ...chunk)
      .first<{ start_at: string }>()

    if (overlap) {
      throw createError({ statusCode: 409, statusMessage: message })
    }
  }
}

async function getExternalRequesterUserId(db: D1Database): Promise<number> {
  const existing = await db
    .prepare(`SELECT id FROM users WHERE phone_number = 'external-requester' AND deleted_at IS NULL LIMIT 1`)
    .first<{ id: number }>()

  if (existing?.id) return Number(existing.id)

  const at = nowIso()
  const result = await db
    .prepare(
      `INSERT INTO users (fullname, phone_number, email, password, is_verified, created_at, updated_at)
       VALUES ('External Requester', 'external-requester', 'external-requester@local.invalid', '', 1, ?1, ?1)`,
    )
    .bind(at)
    .run()

  return Number(result.meta.last_row_id)
}

export async function createApprovedBookingFromExternalRequest(
  db: D1Database,
  params: {
    externalRequestId: number
    reviewerUserId: number
    requesterName: string
    requesterPhone: string
    originEnvironment: string | null
    purpose: string
    participantCount: number
    notes: string | null
    roomId: number
    date: string
    slotStartIsos: string[]
    slotMinutes: number
    requestLetter: {
      objectKey: string | null
      fileName: string | null
      contentType: string | null
      fileSize: number | null
    }
  },
): Promise<number> {
  const at = nowIso()
  const userId = await getExternalRequesterUserId(db)
  const starts = [...params.slotStartIsos].sort((a, b) => a.localeCompare(b))
  const firstStart = starts[0]
  const stepMs = params.slotMinutes * 60 * 1000
  const lastEnd = toIsoNoMs(new Date(new Date(starts[starts.length - 1]!).getTime() + stepMs))

  const bookingResult = await db
    .prepare(
      `INSERT INTO bookings
         (user_id, room_id, status, activity_name, participant_count, notes, is_recurring,
          request_letter_object_key, request_letter_file_name, request_letter_content_type, request_letter_file_size,
          external_request_id, external_requester_name, external_requester_phone, external_origin_environment,
          created_at, updated_at)
       VALUES (?1, ?2, 'approved', ?3, ?4, ?5, 0, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?14)`,
    )
    .bind(
      userId,
      params.roomId,
      params.purpose,
      params.participantCount,
      params.notes,
      params.requestLetter.objectKey,
      params.requestLetter.fileName,
      params.requestLetter.contentType,
      params.requestLetter.fileSize,
      params.externalRequestId,
      params.requesterName,
      params.requesterPhone,
      params.originEnvironment,
      at,
    )
    .run()

  const bookingId = Number(bookingResult.meta.last_row_id)

  const occurrenceResult = await db
    .prepare(
      `INSERT INTO booking_occurrences
         (booking_id, occurrence_date, status, start_at, end_at, created_at, updated_at)
       VALUES (?1, ?2, 'approved', ?3, ?4, ?5, ?5)`,
    )
    .bind(bookingId, params.date, firstStart, lastEnd, at)
    .run()

  const occurrenceId = Number(occurrenceResult.meta.last_row_id)
  const slotStatements = starts.map((slotStartIso) => {
    const slotStart = new Date(slotStartIso)
    const slotEnd = toIsoNoMs(new Date(slotStart.getTime() + stepMs))
    return db
      .prepare(
        `INSERT INTO booking_occurrence_slots (occurrence_id, start_at, end_at)
         VALUES (?1, ?2, ?3)`,
      )
      .bind(occurrenceId, toIsoNoMs(slotStart), slotEnd)
  })

  if (slotStatements.length) {
    await db.batch(slotStatements)
  }

  await db.batch([
    db
      .prepare(
        `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
         VALUES (?1, ?2, ?3, 'created', ?4, ?5)`,
      )
      .bind(bookingId, occurrenceId, params.reviewerUserId, JSON.stringify({ source: 'external_request', externalRequestId: params.externalRequestId }), at),
    db
      .prepare(
        `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
         VALUES (?1, ?2, ?3, 'approved', ?4, ?5)`,
      )
      .bind(bookingId, occurrenceId, params.reviewerUserId, JSON.stringify({ source: 'external_request', externalRequestId: params.externalRequestId }), at),
  ])

  await recalculateBookingSummary(db, bookingId)
  return bookingId
}
