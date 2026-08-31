import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'
import { nowIso, recalculateBookingSummary, requireBookingAccess, resolveOccurrenceForAction } from '../../utils/booking-v2'
import { sendEmail } from '../../utils/email'

type CancelBookingBody = {
  bookingId?: number
  occurrenceId?: number
  scope?: 'occurrence' | 'all' | 'series' | 'one'
  reason?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as CancelBookingBody
  const bookingId = Number(body?.bookingId)
  const occurrenceId = body?.occurrenceId !== undefined && body?.occurrenceId !== null
    ? Number(body.occurrenceId)
    : null
  const rawScope = typeof body?.scope === 'string' ? body.scope : 'occurrence'
  const scope = rawScope === 'all' || rawScope === 'series' ? 'all' : 'occurrence'
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!bookingId) throw createError({ statusCode: 400, statusMessage: 'Invalid bookingId' })
  if (reason.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Reason is too long' })
  }

  const booking = await requireBookingAccess(env.DB, bookingId, Number(auth.sub), hasRole(auth, 'admin'))
  const requester = await env.DB.prepare(
    `SELECT email, fullname FROM users WHERE id = ?1 LIMIT 1`,
  ).bind(booking.user_id).first<{ email: string | null; fullname: string | null }>()

  const at = nowIso()

  if (scope === 'all') {
    const payload = JSON.stringify({ scope: 'all', reason: reason || null })

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
         SELECT booking_id, id, ?2, 'canceled', ?3, ?4
         FROM booking_occurrences
         WHERE booking_id = ?1
           AND status IN ('pending','approved')
           AND end_at >= ?4`,
      ).bind(bookingId, Number(auth.sub), payload, at),
      env.DB.prepare(
        `UPDATE booking_occurrences
         SET status = 'canceled',
             cancel_reason = ?2,
             updated_at = ?3
         WHERE booking_id = ?1
           AND status IN ('pending','approved')
           AND end_at >= ?3`,
      ).bind(bookingId, reason || null, at),
    ])

    const summary = await recalculateBookingSummary(env.DB, bookingId)
    await sendEmail(env, {
      to: { email: requester?.email, name: requester?.fullname },
      subject: `Peminjaman dibatalkan: ${booking.activity_name || `Booking #${bookingId}`}`,
      text: `Peminjaman Anda dibatalkan.\nAlasan: ${reason || '-'}`,
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
    allowedStatuses: ['pending', 'approved'],
  })

  if (target.end_at < at) {
    throw createError({ statusCode: 409, statusMessage: 'Peminjaman yang sudah lewat tidak bisa dibatalkan' })
  }

  const payload = JSON.stringify({ scope: 'occurrence', reason: reason || null })
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE booking_occurrences
       SET status = 'canceled',
           cancel_reason = ?2,
           updated_at = ?3
       WHERE id = ?1`,
    ).bind(target.id, reason || null, at),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, 'canceled', ?4, ?5)`,
    ).bind(bookingId, target.id, Number(auth.sub), payload, at),
  ])

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  await sendEmail(env, {
    to: { email: requester?.email, name: requester?.fullname },
    subject: `Peminjaman dibatalkan: ${booking.activity_name || `Booking #${bookingId}`}`,
    text: `Sesi peminjaman ${target.start_at} - ${target.end_at} dibatalkan.\nAlasan: ${reason || '-'}`,
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
