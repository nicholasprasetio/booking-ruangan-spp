import { createError, getQuery } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getCloudflareEnv } from '../../utils/cf-env'
import { parsePagination } from '../../utils/pagination'
import { hasRole } from '../../utils/roles'
import { getOccurrenceSlotsMap } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)

  try {
    const q = getQuery(event)
    const { page, pageSize, offset } = parsePagination(q)
    const search = typeof q.search === 'string' ? q.search.trim() : ''
    const status = typeof q.status === 'string' ? q.status.trim() : ''
    const isAdmin = hasRole(user, 'admin')

    const conditions: string[] = [
      'b.deleted_at IS NULL',
      `NOT EXISTS (
        SELECT 1
        FROM booking_occurrences bo_active
        WHERE bo_active.booking_id = b.id
          AND bo_active.status IN ('pending','approved')
      )`,
    ]
    const binds: unknown[] = []

    if (!isAdmin) {
      conditions.push('b.user_id = ?')
      binds.push(Number(user.sub))
    }

    if (status && status !== 'all') {
      conditions.push('b.status = ?')
      binds.push(status)
    }

    if (search) {
      if (isAdmin) {
        conditions.push('(r.name LIKE ? OR u.fullname LIKE ? OR u.phone_number LIKE ? OR u.email LIKE ? OR b.activity_name LIKE ?)')
        binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
      } else {
        conditions.push('(r.name LIKE ? OR b.activity_name LIKE ?)')
        binds.push(`%${search}%`, `%${search}%`)
      }
    }

    const whereSql = conditions.join(' AND ')
    const selectUser = isAdmin
      ? ', u.fullname as user_name, u.email as user_email, u.phone_number as user_phone'
      : ''
    const joinUser = isAdmin ? 'LEFT JOIN users u ON u.id = b.user_id' : ''

    const totalRow = await env.DB
      .prepare(
        `SELECT COUNT(*) as total
         FROM bookings b
         LEFT JOIN rooms r ON r.id = b.room_id
         ${joinUser}
         WHERE ${whereSql}`,
      )
      .bind(...binds)
      .first<{ total: number }>()

    const results = await env.DB
      .prepare(
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
            r.name as room_name,
            COALESCE(oc.occurrence_total, 0) as occurrence_total,
            COALESCE(oc.occurrence_pending, 0) as occurrence_pending,
            COALESCE(oc.occurrence_approved, 0) as occurrence_approved,
            COALESCE(oc.occurrence_rejected, 0) as occurrence_rejected,
            COALESCE(oc.occurrence_completed, 0) as occurrence_completed,
            COALESCE(oc.occurrence_canceled, 0) as occurrence_canceled,
            oc.first_occurrence_start,
            oc.last_occurrence_end,
            preview_occ.id as preview_occurrence_id,
            preview_occ.status as preview_occurrence_status,
            preview_occ.start_at as preview_occurrence_start,
            preview_occ.end_at as preview_occurrence_end
            ${selectUser}
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
         LEFT JOIN booking_occurrences preview_occ ON preview_occ.id = (
            SELECT bo2.id
            FROM booking_occurrences bo2
            WHERE bo2.booking_id = b.id
            ORDER BY bo2.end_at DESC
            LIMIT 1
         )
         ${joinUser}
         WHERE ${whereSql}
         ORDER BY b.created_at DESC
         LIMIT ? OFFSET ?`,
      )
      .bind(...binds, pageSize, offset)
      .all()

    const previewOccurrenceIds = (results.results || [])
      .map((row: any) => Number(row.preview_occurrence_id))
      .filter((id: number) => Number.isFinite(id) && id > 0)

    const slotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, previewOccurrenceIds)

    const data = (results.results || []).map((row: any) => {
      const previewOccurrenceId = Number(row.preview_occurrence_id)
      const previewSlots = Number.isFinite(previewOccurrenceId) && previewOccurrenceId > 0
        ? (slotsByOccurrenceId.get(previewOccurrenceId) || [])
        : []

      return {
        id: Number(row.id),
        status: String(row.status || 'pending'),
        created_at: row.created_at,
        room_id: Number(row.room_id),
        room_name: row.room_name,
        activity_name: row.activity_name,
        participant_count: row.participant_count,
        notes: row.notes,
        request_letter_object_key: row.request_letter_object_key,
        request_letter_file_name: row.request_letter_file_name,
        request_letter_content_type: row.request_letter_content_type,
        request_letter_file_size: row.request_letter_file_size,
        rejection_reason: row.rejection_reason,
        is_recurring: Number(row.is_recurring || 0) === 1,
        series_id: row.series_id,
        series_frequency: row.series_frequency,
        series_interval: row.series_interval,
        series_start_date: row.series_start_date,
        series_until_date: row.series_until_date,
        series_rule_json: row.series_rule_json,
        occurrence_total: Number(row.occurrence_total || 0),
        occurrence_pending: Number(row.occurrence_pending || 0),
        occurrence_approved: Number(row.occurrence_approved || 0),
        occurrence_rejected: Number(row.occurrence_rejected || 0),
        occurrence_completed: Number(row.occurrence_completed || 0),
        occurrence_canceled: Number(row.occurrence_canceled || 0),
        first_occurrence_start: row.first_occurrence_start,
        last_occurrence_end: row.last_occurrence_end,
        preview_occurrence: row.preview_occurrence_id
          ? {
              id: previewOccurrenceId,
              status: row.preview_occurrence_status,
              start_at: row.preview_occurrence_start,
              end_at: row.preview_occurrence_end,
              slots: previewSlots,
            }
          : null,
        ...(isAdmin
          ? {
              user_name: row.user_name,
              user_email: row.user_email,
              user_phone: row.user_phone,
            }
          : {}),
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
    console.error('Error fetching booking history:', err)
    if (err?.statusCode) throw err
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      data: { error: 'Failed to fetch booking history' },
    })
  }
})
