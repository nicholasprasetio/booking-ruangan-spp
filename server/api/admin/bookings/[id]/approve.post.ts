import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { ensureBookingKeyToken, ensureBookingKeyTokensForBooking, nowIso, recalculateBookingSummary, resolveOccurrenceForAction } from '../../../../utils/booking-v2'
import { sendEmail } from '../../../../utils/email'

type ApproveBookingBody = {
  occurrenceId?: number
  scope?: 'occurrence' | 'all' | 'one'
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const bookingId = Number(event.context.params?.id)
  if (!bookingId) throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })

  const body = (await readBody(event).catch(() => ({}))) as ApproveBookingBody
  const scope = body?.scope === 'all' ? 'all' : 'occurrence'
  const occurrenceId = body?.occurrenceId !== undefined && body?.occurrenceId !== null
    ? Number(body.occurrenceId)
    : null

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

  if (scope === 'all') {
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
         SELECT booking_id, id, ?2, 'approved', ?3, ?4
         FROM booking_occurrences
         WHERE booking_id = ?1
           AND status = 'pending'`,
      ).bind(bookingId, Number(auth.sub), JSON.stringify({ scope: 'all' }), at),
      env.DB.prepare(
        `UPDATE booking_occurrences
         SET status = 'approved',
             rejection_reason = NULL,
             cancel_reason = NULL,
             updated_at = ?2
         WHERE booking_id = ?1
           AND status = 'pending'`,
      ).bind(bookingId, at),
    ])

    const summary = await recalculateBookingSummary(env.DB, bookingId)
    await ensureBookingKeyTokensForBooking(env.DB, bookingId)
    await sendEmail(env, {
      to: { email: booking.user_email, name: booking.user_name },
      subject: `Peminjaman disetujui: ${booking.activity_name || `Booking #${bookingId}`}`,
      text: `Peminjaman Anda telah disetujui untuk semua sesi pending.`,
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
       SET status = 'approved',
           rejection_reason = NULL,
           cancel_reason = NULL,
           updated_at = ?2
       WHERE id = ?1`,
    ).bind(target.id, at),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, 'approved', ?4, ?5)`,
    ).bind(bookingId, target.id, Number(auth.sub), JSON.stringify({ scope: 'occurrence' }), at),
  ])

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  await ensureBookingKeyToken(env.DB, { bookingId, occurrenceId: target.id, at })
  await sendEmail(env, {
    to: { email: booking.user_email, name: booking.user_name },
    subject: `Peminjaman disetujui: ${booking.activity_name || `Booking #${bookingId}`}`,
    text: `Peminjaman Anda telah disetujui untuk sesi ${target.start_at} - ${target.end_at}.`,
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
