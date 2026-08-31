import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { parsePagination } from '../../../utils/pagination'
import { getOccurrenceSlotsMap, nowIso } from '../../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)
  const { page, pageSize, offset } = parsePagination(q)
  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const status = typeof q.status === 'string' ? q.status.trim() : ''
  const now = nowIso()

  const conditions: string[] = ['b.deleted_at IS NULL']
  const binds: unknown[] = []

  if (status && status !== 'all') {
    conditions.push('b.status = ?')
    binds.push(status)
  }
  if (search) {
    conditions.push('(r.name LIKE ? OR u.fullname LIKE ? OR u.phone_number LIKE ? OR u.email LIKE ? OR b.activity_name LIKE ? OR b.external_requester_name LIKE ? OR b.external_requester_phone LIKE ? OR b.external_origin_environment LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSql = conditions.join(' AND ')

  const totalRow = await env.DB
    .prepare(
      `SELECT COUNT(*) as total
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       WHERE ${whereSql}`,
    )
    .bind(...binds)
    .first<{ total: number }>()

  const res = await env.DB
    .prepare(
      `SELECT
          b.id,
          b.status,
          b.created_at,
          b.activity_name,
          b.participant_count,
          b.notes,
          b.request_letter_object_key,
          b.request_letter_file_name,
          b.request_letter_content_type,
          b.request_letter_file_size,
          b.external_request_id,
          b.external_requester_name,
          b.external_requester_phone,
          b.external_origin_environment,
          b.rejection_reason,
          b.is_recurring,
          b.series_id,
          s.frequency as series_frequency,
          s.interval as series_interval,
          s.start_date as series_start_date,
          s.until_date as series_until_date,
          s.rule_json as series_rule_json,
          u.id AS user_id,
          COALESCE(b.external_requester_name, u.fullname) AS user_name,
          u.email AS user_email,
          COALESCE(b.external_requester_phone, u.phone_number) AS user_phone,
          r.id AS room_id,
          r.name AS room_name,
          COALESCE(oc.occurrence_total, 0) as occurrence_total,
          COALESCE(oc.occurrence_pending, 0) as occurrence_pending,
          COALESCE(oc.occurrence_approved, 0) as occurrence_approved,
          COALESCE(oc.occurrence_rejected, 0) as occurrence_rejected,
          COALESCE(oc.occurrence_completed, 0) as occurrence_completed,
          COALESCE(oc.occurrence_canceled, 0) as occurrence_canceled,
          oc.first_occurrence_start,
          oc.last_occurrence_end,
          next_pending.id as next_pending_occurrence_id,
          next_pending.status as next_pending_occurrence_status,
          next_pending.start_at as next_pending_occurrence_start,
          next_pending.end_at as next_pending_occurrence_end
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN booking_series s ON s.id = b.series_id
       LEFT JOIN (
          SELECT
            booking_id,
            COUNT(*) as occurrence_total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as occurrence_pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as occurrence_approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as occurrence_rejected,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as occurrence_completed,
            SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as occurrence_canceled,
            MIN(start_at) as first_occurrence_start,
            MAX(end_at) as last_occurrence_end
          FROM booking_occurrences
          GROUP BY booking_id
       ) oc ON oc.booking_id = b.id
       LEFT JOIN booking_occurrences next_pending ON next_pending.id = (
          SELECT bo2.id
          FROM booking_occurrences bo2
          WHERE bo2.booking_id = b.id
            AND bo2.status = 'pending'
          ORDER BY CASE WHEN bo2.start_at >= ? THEN 0 ELSE 1 END,
                   bo2.start_at ASC
          LIMIT 1
       )
       WHERE ${whereSql}
       ORDER BY b.created_at DESC
       LIMIT ${pageSize} OFFSET ${offset}`,
    )
    .bind(now, ...binds)
    .all()

  const nextPendingOccurrenceIds = (res.results || [])
    .map((row: any) => Number(row.next_pending_occurrence_id))
    .filter((id: number) => Number.isFinite(id) && id > 0)

  const slotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, nextPendingOccurrenceIds)

  const total = totalRow?.total || 0
  return {
    ok: true,
    data: (res.results || []).map((b: any) => {
      const nextPendingOccurrenceId = Number(b.next_pending_occurrence_id)
      const nextSlots = Number.isFinite(nextPendingOccurrenceId) && nextPendingOccurrenceId > 0
        ? (slotsByOccurrenceId.get(nextPendingOccurrenceId) || [])
        : []

      return {
        id: Number(b.id),
        status: String(b.status || 'pending'),
        created_at: b.created_at,
        activity_name: b.activity_name,
        participant_count: b.participant_count,
        notes: b.notes,
        request_letter_object_key: b.request_letter_object_key,
        request_letter_file_name: b.request_letter_file_name,
        request_letter_content_type: b.request_letter_content_type,
        request_letter_file_size: b.request_letter_file_size,
        external_request_id: b.external_request_id !== null ? Number(b.external_request_id) : null,
        external_requester_name: b.external_requester_name,
        external_requester_phone: b.external_requester_phone,
        external_origin_environment: b.external_origin_environment,
        rejection_reason: b.rejection_reason,
        is_recurring: Number(b.is_recurring || 0) === 1,
        series_id: b.series_id,
        series_frequency: b.series_frequency,
        series_interval: b.series_interval,
        series_start_date: b.series_start_date,
        series_until_date: b.series_until_date,
        series_rule_json: b.series_rule_json,
        user_id: Number(b.user_id),
        user_name: b.user_name,
        user_email: b.user_email,
        user_phone: b.user_phone,
        room_id: Number(b.room_id),
        room_name: b.room_name,
        occurrence_total: Number(b.occurrence_total || 0),
        occurrence_pending: Number(b.occurrence_pending || 0),
        occurrence_approved: Number(b.occurrence_approved || 0),
        occurrence_rejected: Number(b.occurrence_rejected || 0),
        occurrence_completed: Number(b.occurrence_completed || 0),
        occurrence_canceled: Number(b.occurrence_canceled || 0),
        first_occurrence_start: b.first_occurrence_start,
        last_occurrence_end: b.last_occurrence_end,
        next_pending_occurrence: b.next_pending_occurrence_id
          ? {
              id: nextPendingOccurrenceId,
              status: b.next_pending_occurrence_status,
              start_at: b.next_pending_occurrence_start,
              end_at: b.next_pending_occurrence_end,
              slots: nextSlots,
            }
          : null,
      }
    }),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
