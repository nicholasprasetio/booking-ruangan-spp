import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { ensureBookingKeyToken, nowIso, recalculateBookingSummary, resolveOccurrenceForAction } from '../../../utils/booking-v2'

type BulkBookingActionBody = {
  action?: 'approve' | 'reject' | 'cancel'
  items?: Array<{ bookingId?: number; occurrenceId?: number | null; scope?: 'occurrence' | 'all' }>
  reason?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody<BulkBookingActionBody>(event)
  const action = body?.action
  const items = Array.isArray(body?.items) ? body.items : []
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''

  if (!action || !['approve', 'reject', 'cancel'].includes(action)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid action' })
  }
  if (!items.length) throw createError({ statusCode: 400, statusMessage: 'No booking selected' })
  if ((action === 'reject' || action === 'cancel') && reason.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Reason is too long' })
  }
  if (action === 'reject' && !reason) {
    throw createError({ statusCode: 400, statusMessage: 'Rejection reason is required' })
  }

  const at = nowIso()
  const touched = new Set<number>()
  const results: Array<{ bookingId: number; occurrenceId?: number; ok: boolean; error?: string }> = []

  for (const item of items) {
    const bookingId = Number(item.bookingId)
    if (!bookingId) {
      results.push({ bookingId: 0, ok: false, error: 'Invalid bookingId' })
      continue
    }

    try {
      const scope = item.scope === 'all' ? 'all' : 'occurrence'
      const booking = await env.DB.prepare(
        `SELECT id FROM bookings WHERE id = ?1 AND deleted_at IS NULL LIMIT 1`,
      ).bind(bookingId).first<{ id: number }>()
      if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })

      if (scope === 'all') {
        if (action === 'approve') {
          const rows = await env.DB.prepare(
            `SELECT id FROM booking_occurrences WHERE booking_id = ?1 AND status = 'pending'`,
          ).bind(bookingId).all<{ id: number }>()
          await env.DB.batch([
            env.DB.prepare(
              `UPDATE booking_occurrences
               SET status = 'approved', rejection_reason = NULL, cancel_reason = NULL, updated_at = ?2
               WHERE booking_id = ?1 AND status = 'pending'`,
            ).bind(bookingId, at),
            env.DB.prepare(
              `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
               SELECT booking_id, id, ?2, 'approved', ?3, ?4
               FROM booking_occurrences
               WHERE booking_id = ?1 AND status = 'approved'`,
            ).bind(bookingId, Number(auth.sub), JSON.stringify({ scope: 'all', bulk: true }), at),
          ])
          for (const row of rows.results || []) await ensureBookingKeyToken(env.DB, { bookingId, occurrenceId: Number(row.id), at })
        } else {
          const targetStatus = action === 'reject' ? 'rejected' : 'canceled'
          const eventType = action === 'reject' ? 'rejected' : 'canceled'
          const allowedSql = action === 'reject' ? "status = 'pending'" : "status IN ('approved','rejected')"
          await env.DB.batch([
            env.DB.prepare(
              `UPDATE booking_occurrences
               SET status = ?2,
                   rejection_reason = CASE WHEN ?2 = 'rejected' THEN ?3 ELSE rejection_reason END,
                   cancel_reason = CASE WHEN ?2 = 'canceled' THEN ?3 ELSE cancel_reason END,
                   updated_at = ?4
               WHERE booking_id = ?1 AND ${allowedSql}`,
            ).bind(bookingId, targetStatus, reason || null, at),
            env.DB.prepare(
              `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
               SELECT booking_id, id, ?2, ?3, ?4, ?5
               FROM booking_occurrences
               WHERE booking_id = ?1 AND status = ?6`,
            ).bind(bookingId, Number(auth.sub), eventType, JSON.stringify({ scope: 'all', bulk: true, reason: reason || null }), at, targetStatus),
          ])
        }
        touched.add(bookingId)
        results.push({ bookingId, ok: true })
        continue
      }

      const allowedStatuses = action === 'approve'
        ? ['pending']
        : action === 'reject'
          ? ['pending']
          : ['approved', 'rejected']
      const target = await resolveOccurrenceForAction(env.DB, {
        bookingId,
        occurrenceId: item.occurrenceId ? Number(item.occurrenceId) : null,
        allowedStatuses,
      })

      const nextStatus = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'canceled'
      await env.DB.batch([
        env.DB.prepare(
          `UPDATE booking_occurrences
           SET status = ?2,
               rejection_reason = CASE WHEN ?2 = 'rejected' THEN ?3 ELSE rejection_reason END,
               cancel_reason = CASE WHEN ?2 = 'canceled' THEN ?3 ELSE cancel_reason END,
               updated_at = ?4
           WHERE id = ?1`,
        ).bind(target.id, nextStatus, reason || null, at),
        env.DB.prepare(
          `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
           VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
        ).bind(bookingId, target.id, Number(auth.sub), action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'canceled', JSON.stringify({ scope: 'occurrence', bulk: true, reason: reason || null }), at),
      ])
      if (action === 'approve') await ensureBookingKeyToken(env.DB, { bookingId, occurrenceId: target.id, at })
      touched.add(bookingId)
      results.push({ bookingId, occurrenceId: target.id, ok: true })
    } catch (error: any) {
      results.push({ bookingId, ok: false, error: error?.statusMessage || error?.message || 'Failed' })
    }
  }

  for (const bookingId of touched) {
    await recalculateBookingSummary(env.DB, bookingId)
  }

  return {
    ok: true,
    processed: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  }
})
