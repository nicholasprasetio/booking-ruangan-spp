import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { getOccurrenceSlotsMap } from '../../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)

  const startDate = typeof q.start_date === 'string' ? q.start_date.trim() : ''
  const endDate = typeof q.end_date === 'string' ? q.end_date.trim() : ''
  const status = typeof q.status === 'string' ? q.status.trim() : ''
  const roomId = q.room_id ? Number(q.room_id) : null
  const search = typeof q.search === 'string' ? q.search.trim() : ''

  if (!startDate || !endDate) {
    throw createError({ statusCode: 400, statusMessage: 'start_date and end_date are required' })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date range (expected YYYY-MM-DD)' })
  }

  const conditions: string[] = ['b.deleted_at IS NULL']
  const binds: unknown[] = []

  conditions.push('bo.start_at >= ?')
  binds.push(`${startDate}T00:00:00.000Z`)
  conditions.push('bo.start_at <= ?')
  binds.push(`${endDate}T23:59:59.999Z`)

  if (status && status !== 'all') {
    conditions.push('bo.status = ?')
    binds.push(status)
  }

  if (roomId) {
    conditions.push('b.room_id = ?')
    binds.push(roomId)
  }

  if (search) {
    conditions.push('(r.name LIKE ? OR u.fullname LIKE ? OR b.activity_name LIKE ? OR b.external_requester_name LIKE ? OR b.external_requester_phone LIKE ? OR b.external_origin_environment LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSql = conditions.join(' AND ')

  const summaryResult = await env.DB
    .prepare(
      `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN bo.status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN bo.status = 'approved' THEN 1 ELSE 0 END) as approved,
          SUM(CASE WHEN bo.status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          SUM(CASE WHEN bo.status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN bo.status = 'canceled' THEN 1 ELSE 0 END) as canceled
       FROM booking_occurrences bo
       JOIN bookings b ON b.id = bo.booking_id
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       WHERE ${whereSql}`,
    )
    .bind(...binds)
    .first<{
      total: number
      pending: number
      approved: number
      rejected: number
      completed: number
      canceled: number
    }>()

  const res = await env.DB
    .prepare(
      `SELECT
          bo.id as occurrence_id,
          bo.status,
          bo.start_at,
          bo.end_at,
          bo.rejection_reason,
          bo.cancel_reason,
          bo.created_at as occurrence_created_at,
          b.id as booking_id,
          b.created_at,
          b.activity_name,
          b.participant_count,
          b.notes,
          b.external_request_id,
          b.external_requester_name,
          b.external_requester_phone,
          b.external_origin_environment,
          b.series_id,
          b.is_recurring,
          COALESCE(b.external_requester_name, u.fullname) AS user_name,
          u.email AS user_email,
          COALESCE(b.external_requester_phone, u.phone_number) AS user_phone,
          r.id AS room_id,
          r.name AS room_name
       FROM booking_occurrences bo
       JOIN bookings b ON b.id = bo.booking_id
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       WHERE ${whereSql}
       ORDER BY bo.start_at DESC
       LIMIT 2000`,
    )
    .bind(...binds)
    .all<{
      occurrence_id: number
      status: string
      start_at: string
      end_at: string
      rejection_reason: string | null
      cancel_reason: string | null
      occurrence_created_at: string
      booking_id: number
      created_at: string
      activity_name: string | null
      participant_count: number | null
      notes: string | null
      external_request_id: number | null
      external_requester_name: string | null
      external_requester_phone: string | null
      external_origin_environment: string | null
      series_id: number | null
      is_recurring: number
      user_name: string | null
      user_email: string | null
      user_phone: string | null
      room_id: number
      room_name: string | null
    }>()

  const occurrenceIds = (res.results || []).map((row) => Number(row.occurrence_id)).filter(Boolean)
  const slotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, occurrenceIds)

  return {
    ok: true,
    data: (res.results || []).map((row) => ({
      id: Number(row.occurrence_id),
      occurrence_id: Number(row.occurrence_id),
      booking_id: Number(row.booking_id),
      status: row.status,
      start_date: row.start_at,
      end_date: row.end_at,
      created_at: row.created_at,
      activity_name: row.activity_name,
      participant_count: row.participant_count,
      notes: row.notes,
      external_request_id: row.external_request_id !== null ? Number(row.external_request_id) : null,
      external_requester_name: row.external_requester_name,
      external_requester_phone: row.external_requester_phone,
      external_origin_environment: row.external_origin_environment,
      rejection_reason: row.rejection_reason,
      cancel_reason: row.cancel_reason,
      series_id: row.series_id,
      is_recurring: Number(row.is_recurring || 0) === 1,
      user_name: row.user_name,
      user_email: row.user_email,
      user_phone: row.user_phone,
      room_id: Number(row.room_id),
      room_name: row.room_name,
      slots: slotsByOccurrenceId.get(Number(row.occurrence_id)) || [],
    })),
    summary: {
      total: Number(summaryResult?.total || 0),
      pending: Number(summaryResult?.pending || 0),
      approved: Number(summaryResult?.approved || 0),
      rejected: Number(summaryResult?.rejected || 0),
      completed: Number(summaryResult?.completed || 0),
      canceled: Number(summaryResult?.canceled || 0),
    },
  }
})
