import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { nowIso, recalculateBookingSummary } from '../../../../utils/booking-v2'
import { sendEmail } from '../../../../utils/email'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const bookingId = Number(getRouterParam(event, 'id'))
  if (!bookingId) throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })

  const body = await readBody<{ roomId?: number }>(event)
  const targetRoomId = Number(body?.roomId)
  if (!targetRoomId) throw createError({ statusCode: 400, statusMessage: 'Invalid roomId' })

  const env = getCloudflareEnv(event)

  const booking = await env.DB.prepare(
    `SELECT b.id, b.room_id, b.series_id, b.activity_name, u.email AS user_email, COALESCE(b.external_requester_name, u.fullname) AS user_name
     FROM bookings b
     JOIN users u ON u.id = b.user_id
     WHERE b.id = ?1
       AND b.deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(bookingId)
    .first<{ id: number; room_id: number; series_id: number | null; activity_name: string | null; user_email: string | null; user_name: string | null }>()

  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (Number(booking.room_id) === targetRoomId) {
    return { ok: true, bookingId, roomId: targetRoomId, unchanged: true }
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

  const completed = await env.DB.prepare(
    `SELECT id
     FROM booking_occurrences
     WHERE booking_id = ?1
       AND status = 'completed'
     LIMIT 1`,
  )
    .bind(bookingId)
    .first<{ id: number }>()

  if (completed) {
    throw createError({ statusCode: 409, statusMessage: 'Tidak bisa mengganti ruangan karena booking memiliki peminjaman yang sudah selesai' })
  }

  const slots = await env.DB.prepare(
    `SELECT bos.start_at
     FROM booking_occurrence_slots bos
     JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
     WHERE bo.booking_id = ?1
       AND bo.status IN ('pending','approved')
     ORDER BY bos.start_at ASC`,
  )
    .bind(bookingId)
    .all<{ start_at: string }>()

  const starts = (slots.results || []).map((row) => row.start_at).filter(Boolean)
  if (starts.length) {
    for (let i = 0; i < starts.length; i += 98) {
      const chunk = starts.slice(i, i + 98)
      const placeholders = chunk.map((_, idx) => `?${idx + 3}`).join(', ')
      const overlap = await env.DB.prepare(
        `SELECT bos.start_at
         FROM booking_occurrence_slots bos
         JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
         JOIN bookings b ON b.id = bo.booking_id
         WHERE COALESCE(bo.room_id, b.room_id) = ?1
           AND b.id != ?2
           AND b.deleted_at IS NULL
           AND bo.status IN ('pending','approved')
           AND bos.start_at IN (${placeholders})
         LIMIT 1`,
      )
        .bind(targetRoomId, bookingId, ...chunk)
        .first<{ start_at: string }>()

      if (overlap) {
        throw createError({ statusCode: 409, statusMessage: 'Ruangan tujuan tidak tersedia pada salah satu jadwal booking ini' })
      }
    }
  }

  const at = nowIso()
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE bookings
       SET room_id = ?2,
           updated_at = ?3
       WHERE id = ?1`,
    ).bind(bookingId, targetRoomId, at),
    ...(booking.series_id
      ? [
          env.DB.prepare(
            `UPDATE booking_series
             SET room_id = ?2,
                 updated_at = ?3
             WHERE id = ?1`,
          ).bind(booking.series_id, targetRoomId, at),
        ]
      : []),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, NULL, ?2, 'room_changed', ?3, ?4)`,
    ).bind(
      bookingId,
      Number(auth.sub),
      JSON.stringify({ fromRoomId: Number(booking.room_id), toRoomId: targetRoomId, toRoomName: room.name }),
      at,
    ),
  ])

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  await sendEmail(env, {
    to: { email: booking.user_email, name: booking.user_name },
    subject: `Ruangan peminjaman diganti: ${booking.activity_name || `Booking #${bookingId}`}`,
    text: `Ruangan peminjaman Anda telah diganti ke ${room.name || `Room #${targetRoomId}`}.`,
  })
  return { ok: true, bookingId, roomId: targetRoomId, status: summary.status, summary }
})
