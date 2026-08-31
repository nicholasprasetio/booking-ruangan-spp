import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { nowIso, recalculateBookingSummary, resolveOccurrenceForAction } from '../../../../utils/booking-v2'
import { sendEmail } from '../../../../utils/email'

type RejectBookingBody = {
  reason?: string
  occurrenceId?: number
  scope?: 'occurrence' | 'all' | 'one'
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const bookingId = Number(event.context.params?.id)
  if (!bookingId) throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })

  const body = (await readBody(event)) as RejectBookingBody
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  const scope = body?.scope === 'all' ? 'all' : 'occurrence'
  const occurrenceId = body?.occurrenceId !== undefined && body?.occurrenceId !== null
    ? Number(body.occurrenceId)
    : null

  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: 'Rejection reason is required' })
  }
  if (reason.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Rejection reason is too long' })
  }

  const booking = await env.DB
    .prepare(
      `SELECT b.id, b.activity_name, u.email AS user_email, COALESCE(b.external_requester_name, u.fullname) AS user_name
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       WHERE b.id = ?1 AND b.deleted_at IS NULL LIMIT 1`,
    )
    .bind(bookingId)
    .first<{ id: number; activity_name: string | null; user_email: string | null; user_name: string | null }>()

  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

  const at = nowIso()
  const payload = JSON.stringify({ scope, reason })

  if (scope === 'all') {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
         SELECT booking_id, id, ?2, 'rejected', ?3, ?4
         FROM booking_occurrences
         WHERE booking_id = ?1
           AND status = 'pending'`,
      ).bind(bookingId, Number(auth.sub), payload, at),
      env.DB.prepare(
        `UPDATE booking_occurrences
         SET status = 'rejected',
             rejection_reason = ?2,
             cancel_reason = NULL,
             updated_at = ?3
         WHERE booking_id = ?1
           AND status = 'pending'`,
      ).bind(bookingId, reason, at),
    ])

    const summary = await recalculateBookingSummary(env.DB, bookingId)
    await sendEmail(env, {
      to: { email: booking.user_email, name: booking.user_name },
      subject: `Peminjaman ditolak: ${booking.activity_name || `Booking #${bookingId}`}`,
      text: `Peminjaman Anda ditolak.\nAlasan: ${reason}`,
    })
    return {
      ok: true,
      bookingId,
      scope: 'all',
      status: summary.status,
      summary,
    }
  }

  const target = await resolveOccurrenceForAction(env.DB, {
    bookingId,
    occurrenceId,
    allowedStatuses: ['pending'],
  })

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE booking_occurrences
       SET status = 'rejected',
           rejection_reason = ?2,
           cancel_reason = NULL,
           updated_at = ?3
       WHERE id = ?1`,
    ).bind(target.id, reason, at),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, 'rejected', ?4, ?5)`,
    ).bind(bookingId, target.id, Number(auth.sub), payload, at),
  ])

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  await sendEmail(env, {
    to: { email: booking.user_email, name: booking.user_name },
    subject: `Peminjaman ditolak: ${booking.activity_name || `Booking #${bookingId}`}`,
    text: `Peminjaman Anda ditolak untuk sesi ${target.start_at} - ${target.end_at}.\nAlasan: ${reason}`,
  })

  return {
    ok: true,
    bookingId,
    occurrenceId: target.id,
    scope: 'occurrence',
    status: summary.status,
    summary,
  }
})
