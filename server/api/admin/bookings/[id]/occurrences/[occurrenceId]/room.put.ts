import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../../../utils/cf-env'
import { requireAuth } from '../../../../../../utils/auth'
import { requireRole } from '../../../../../../utils/roles'
import { nowIso, recalculateBookingSummary } from '../../../../../../utils/booking-v2'
import { sendEmail } from '../../../../../../utils/email'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const bookingId = Number(getRouterParam(event, 'id'))
  const occurrenceId = Number(getRouterParam(event, 'occurrenceId'))
  const body = await readBody<{ roomId?: number }>(event)
  const targetRoomId = Number(body?.roomId)

  if (!bookingId || !occurrenceId) throw createError({ statusCode: 400, statusMessage: 'Invalid booking/occurrence id' })
  if (!targetRoomId) throw createError({ statusCode: 400, statusMessage: 'Invalid roomId' })

  const occurrence = await env.DB.prepare(
    `SELECT bo.id, bo.status, COALESCE(bo.room_id, b.room_id) AS room_id, bo.start_at, bo.end_at,
            b.activity_name, u.email AS user_email, COALESCE(b.external_requester_name, u.fullname) AS user_name
     FROM booking_occurrences bo
     JOIN bookings b ON b.id = bo.booking_id
     JOIN users u ON u.id = b.user_id
     WHERE bo.id = ?1
       AND bo.booking_id = ?2
       AND b.deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(occurrenceId, bookingId)
    .first<{ id: number; status: string; room_id: number; start_at: string; end_at: string; activity_name: string | null; user_email: string | null; user_name: string | null }>()

  if (!occurrence) throw createError({ statusCode: 404, statusMessage: 'Occurrence not found' })
  if (!['pending', 'approved', 'rejected'].includes(occurrence.status)) {
    throw createError({ statusCode: 409, statusMessage: 'Status sesi ini tidak bisa diganti ruangan' })
  }
  if (Number(occurrence.room_id) === targetRoomId) {
    return { ok: true, bookingId, occurrenceId, roomId: targetRoomId, unchanged: true }
  }

  const room = await env.DB.prepare(
    `SELECT id, name
     FROM rooms
     WHERE id = ?1
       AND deleted_at IS NULL
       AND COALESCE(available_for_booking, 1) = 1
     LIMIT 1`,
  )
    .bind(targetRoomId)
    .first<{ id: number; name: string | null }>()
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Target room not found or not available for booking' })

  const slots = await env.DB.prepare(
    `SELECT start_at
     FROM booking_occurrence_slots
     WHERE occurrence_id = ?1
     ORDER BY start_at ASC`,
  ).bind(occurrenceId).all<{ start_at: string }>()
  const starts = (slots.results || []).map((row) => row.start_at)

  if (starts.length) {
    const placeholders = starts.map((_, idx) => `?${idx + 3}`).join(', ')
    const overlap = await env.DB.prepare(
      `SELECT bos.start_at
       FROM booking_occurrence_slots bos
       JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
       JOIN bookings b ON b.id = bo.booking_id
       WHERE COALESCE(bo.room_id, b.room_id) = ?1
         AND bo.id != ?2
         AND b.deleted_at IS NULL
         AND bo.status IN ('pending','approved')
         AND bos.start_at IN (${placeholders})
       LIMIT 1`,
    ).bind(targetRoomId, occurrenceId, ...starts).first<{ start_at: string }>()
    if (overlap) throw createError({ statusCode: 409, statusMessage: 'Ruangan tujuan tidak tersedia pada jadwal sesi ini' })
  }

  const at = nowIso()
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE booking_occurrences
       SET room_id = ?2,
           updated_at = ?3
       WHERE id = ?1`,
    ).bind(occurrenceId, targetRoomId, at),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, 'room_changed', ?4, ?5)`,
    ).bind(
      bookingId,
      occurrenceId,
      Number(auth.sub),
      JSON.stringify({ scope: 'occurrence', fromRoomId: Number(occurrence.room_id), toRoomId: targetRoomId, toRoomName: room.name }),
      at,
    ),
  ])

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  await sendEmail(env, {
    to: { email: occurrence.user_email, name: occurrence.user_name },
    subject: `Ruangan sesi peminjaman diganti: ${occurrence.activity_name || `Booking #${bookingId}`}`,
    text: `Ruangan sesi ${occurrence.start_at} - ${occurrence.end_at} telah diganti ke ${room.name || `Room #${targetRoomId}`}.`,
  })
  return { ok: true, bookingId, occurrenceId, roomId: targetRoomId, status: summary.status, summary }
})
