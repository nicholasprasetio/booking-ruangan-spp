import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'

type BookingRow = {
  occurrence_id: number | null
  booking_id: number | null
  occurrence_status: string | null
  booking_user_id: number | null
  slot_start: string | null
  slot_end: string | null
  room_id: number
  room_name: string | null
  room_description: string | null
  room_capacity: number | null
  room_open_start: string | null
  room_open_end: string | null
  room_slot_minutes: number | null
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
  const dayStart = new Date(`${dateStr}T00:00:00.000+07:00`)
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
  const startIso = dayStart.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const endIso = dayEnd.toISOString().replace(/\.\d{3}Z$/, 'Z')
  return { dayStart: startIso, dayEnd: endIso, label: dateStr }
}

function isActive(nowIso: string, start: string, end: string): boolean {
  return start <= nowIso && nowIso < end
}

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const env = getCloudflareEnv(event)

  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid room ID' })
  }

  const q = getQuery(event)
  const { dayStart, dayEnd, label } = toIsoDayRange(typeof q.date === 'string' ? q.date : undefined)
  const excludeBookingId =
    typeof q.excludeBookingId === 'string' && q.excludeBookingId.trim() && !isNaN(Number(q.excludeBookingId))
      ? Number(q.excludeBookingId)
      : null
  const excludeSeriesId =
    typeof q.excludeSeriesId === 'string' && q.excludeSeriesId.trim() && !isNaN(Number(q.excludeSeriesId))
      ? Number(q.excludeSeriesId)
      : null
  const excludeOccurrenceId =
    typeof q.excludeOccurrenceId === 'string' && q.excludeOccurrenceId.trim() && !isNaN(Number(q.excludeOccurrenceId))
      ? Number(q.excludeOccurrenceId)
      : null
  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')

  const rows = await env.DB
    .prepare(
      `SELECT
          r.id AS room_id,
          r.name AS room_name,
          r.capacity AS room_capacity,
          r.description AS room_description,
          r.open_time_start AS room_open_start,
          r.open_time_end AS room_open_end,
          r.slot_minutes AS room_slot_minutes,
          bo.id AS occurrence_id,
          bo.booking_id AS booking_id,
          bo.status AS occurrence_status,
          b.user_id AS booking_user_id,
          bos.start_at AS slot_start,
          bos.end_at AS slot_end
       FROM rooms r
       LEFT JOIN bookings b
         ON b.room_id = r.id
        AND b.deleted_at IS NULL
       LEFT JOIN booking_occurrences bo
         ON bo.booking_id = b.id
        AND bo.status IN ('pending','approved')
        AND (?4 IS NULL OR bo.id != ?4)
        AND (?5 IS NULL OR bo.booking_id != ?5)
        AND (?6 IS NULL OR bo.booking_id != ?6)
       LEFT JOIN booking_occurrence_slots bos
         ON bos.occurrence_id = bo.id
        AND bos.start_at < ?2
        AND bos.end_at > ?1
       WHERE r.deleted_at IS NULL
         AND COALESCE(r.available_for_booking, 1) = 1
         AND r.id = ?3
       ORDER BY bos.start_at ASC`,
    )
    .bind(dayStart, dayEnd, id, excludeOccurrenceId, excludeBookingId, excludeSeriesId)
    .all<BookingRow>()

  if (rows.results.length === 0) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found or not available for booking' })
  }

  const room = rows.results[0]!
  const bookings = rows.results
    .filter((row) => row.occurrence_id && row.slot_start && row.slot_end)
    .map((row) => ({
      id: row.occurrence_id,
      bookingId: row.booking_id,
      status: row.occurrence_status,
      start: row.slot_start as string,
      end: row.slot_end as string,
      userId: row.booking_user_id,
      isActive: isActive(nowIso, row.slot_start as string, row.slot_end as string),
    }))

  const active = bookings.find((b) => b.isActive) || null
  const status = active ? 'occupied' : bookings.length ? 'booked' : 'available'

  return {
    ok: true,
    date: label,
    dayStart,
    dayEnd,
    now: nowIso,
    room: {
      id: room.room_id,
      name: room.room_name,
      description: room.room_description,
      capacity: room.room_capacity,
      open_time_start: room.room_open_start,
      open_time_end: room.room_open_end,
      slot_minutes: room.room_slot_minutes,
      status,
      active,
      bookings,
    },
  }
})
