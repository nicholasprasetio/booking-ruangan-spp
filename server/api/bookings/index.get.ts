import { createError, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getCloudflareEnv } from '../../utils/cf-env'
import { parsePagination } from '../../utils/pagination'
import { getOccurrenceSlotsMap, nowIso } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)

  try {
    const q = getQuery(event)
    const { page, pageSize, offset } = parsePagination(q)
    const search = typeof q.search === 'string' ? q.search.trim() : ''
    const status = typeof q.status === 'string' ? q.status.trim() : ''
    const now = nowIso()

    const conditions: string[] = [
      'b.user_id = ?',
      'b.deleted_at IS NULL',
      `EXISTS (
        SELECT 1
        FROM booking_occurrences bo_active
        WHERE bo_active.booking_id = b.id
          AND bo_active.status IN ('pending','approved')
      )`,
    ]
    const binds: unknown[] = [Number(user.sub)]

    if (status && status !== 'all') {
      conditions.push('b.status = ?')
      binds.push(status)
    }
    if (search) {
      conditions.push('(r.name LIKE ? OR b.activity_name LIKE ?)')
      binds.push(`%${search}%`, `%${search}%`)
    }

    const whereSql = conditions.join(' AND ')

    const totalRow = await env.DB.prepare(
      `SELECT COUNT(*) as total
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
       WHERE ${whereSql}`,
    )
      .bind(...binds)
      .first<{ total: number }>()

    const results = await env.DB.prepare(
      `SELECT
          b.id,
          b.status,
          b.created_at,
          b.room_id,
          b.activity_name,
          b.participant_count,
          b.notes,
          b.request_letter_object_key,
          b.request_letter_file_name,
          b.request_letter_content_type,
          b.request_letter_file_size,
          b.rejection_reason,
          b.is_recurring,
          b.series_id,
          s.frequency as series_frequency,
          s.interval as series_interval,
          s.start_date as series_start_date,
          s.until_date as series_until_date,
          s.rule_json as series_rule_json,
          COALESCE(oc.occurrence_total, 0) as occurrence_total,
          COALESCE(oc.occurrence_pending, 0) as occurrence_pending,
          COALESCE(oc.occurrence_approved, 0) as occurrence_approved,
          COALESCE(oc.occurrence_rejected, 0) as occurrence_rejected,
          COALESCE(oc.occurrence_completed, 0) as occurrence_completed,
          COALESCE(oc.occurrence_canceled, 0) as occurrence_canceled,
          oc.first_occurrence_start,
          oc.last_occurrence_end,
          next_occ.id as next_occurrence_id,
          next_occ.status as next_occurrence_status,
          next_occ.start_at as next_occurrence_start,
          next_occ.end_at as next_occurrence_end,
          r.name as room_name
       FROM bookings b
       LEFT JOIN rooms r ON r.id = b.room_id
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
       LEFT JOIN booking_occurrences next_occ ON next_occ.id = (
          SELECT bo2.id
          FROM booking_occurrences bo2
          WHERE bo2.booking_id = b.id
            AND bo2.status IN ('pending','approved')
          ORDER BY CASE WHEN bo2.start_at >= ? THEN 0 ELSE 1 END,
                   bo2.start_at ASC
          LIMIT 1
       )
       WHERE ${whereSql}
       ORDER BY b.created_at DESC
       LIMIT ? OFFSET ?`,
    )
      .bind(now, ...binds, pageSize, offset)
      .all()

    const nextOccurrenceIds = (results.results || [])
      .map((row: any) => Number(row.next_occurrence_id))
      .filter((id: number) => Number.isFinite(id) && id > 0)
    const slotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, nextOccurrenceIds)

    const data = (results.results || []).map((b: any) => {
      const nextOccurrenceId = Number(b.next_occurrence_id)
      const nextSlots = Number.isFinite(nextOccurrenceId) && nextOccurrenceId > 0
        ? (slotsByOccurrenceId.get(nextOccurrenceId) || [])
        : []

      return {
        id: Number(b.id),
        status: String(b.status || 'pending'),
        created_at: b.created_at,
        room_id: Number(b.room_id),
        room_name: b.room_name,
        activity_name: b.activity_name,
        participant_count: b.participant_count,
        notes: b.notes,
        request_letter_object_key: b.request_letter_object_key,
        request_letter_file_name: b.request_letter_file_name,
        request_letter_content_type: b.request_letter_content_type,
        request_letter_file_size: b.request_letter_file_size,
        rejection_reason: b.rejection_reason,
        is_recurring: Number(b.is_recurring || 0) === 1,
        series_id: b.series_id,
        series_frequency: b.series_frequency,
        series_interval: b.series_interval,
        series_start_date: b.series_start_date,
        series_until_date: b.series_until_date,
        series_rule_json: b.series_rule_json,
        occurrence_total: Number(b.occurrence_total || 0),
        occurrence_pending: Number(b.occurrence_pending || 0),
        occurrence_approved: Number(b.occurrence_approved || 0),
        occurrence_rejected: Number(b.occurrence_rejected || 0),
        occurrence_completed: Number(b.occurrence_completed || 0),
        occurrence_canceled: Number(b.occurrence_canceled || 0),
        first_occurrence_start: b.first_occurrence_start,
        last_occurrence_end: b.last_occurrence_end,
        next_occurrence: b.next_occurrence_id
          ? {
              id: nextOccurrenceId,
              status: b.next_occurrence_status,
              start_at: b.next_occurrence_start,
              end_at: b.next_occurrence_end,
              slots: nextSlots,
            }
          : null,
      }
    })

    const total = totalRow?.total || 0
    return {
      ok: true,
      data,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    }
  } catch (err: any) {
    console.error('Error fetching user bookings:', err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to fetch bookings' }
    })
  }
})
