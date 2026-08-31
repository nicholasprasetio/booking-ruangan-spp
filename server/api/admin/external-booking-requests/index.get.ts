import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { parsePagination } from '../../../utils/pagination'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)
  const { page, pageSize, offset } = parsePagination(q)
  const status = typeof q.status === 'string' ? q.status.trim() : ''
  const search = typeof q.search === 'string' ? q.search.trim() : ''

  const conditions = ['1 = 1']
  const binds: unknown[] = []
  if (status && status !== 'all') {
    conditions.push('ebr.status = ?')
    binds.push(status)
  }
  if (search) {
    conditions.push('(ebr.requester_name LIKE ? OR ebr.requester_phone LIKE ? OR ebr.purpose LIKE ? OR ebr.origin_environment LIKE ? OR r.name LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSql = conditions.join(' AND ')
  const totalRow = await env.DB
    .prepare(
      `SELECT COUNT(*) as total
       FROM external_booking_requests ebr
       JOIN rooms r ON r.id = ebr.room_id
       WHERE ${whereSql}`,
    )
    .bind(...binds)
    .first<{ total: number }>()

  const rows = await env.DB
    .prepare(
      `SELECT
          ebr.*,
          r.name as room_name,
          r.location as room_location,
          r.capacity as room_capacity,
          reviewer.fullname as reviewer_name
       FROM external_booking_requests ebr
       JOIN rooms r ON r.id = ebr.room_id
       LEFT JOIN users reviewer ON reviewer.id = ebr.reviewed_by
       WHERE ${whereSql}
       ORDER BY ebr.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .bind(...binds, pageSize, offset)
    .all<any>()

  const total = Number(totalRow?.total || 0)
  return {
    ok: true,
    data: (rows.results || []).map((row: any) => ({
      ...row,
      id: Number(row.id),
      room_id: Number(row.room_id),
      participant_count: Number(row.participant_count),
      request_letter_file_size: row.request_letter_file_size !== null ? Number(row.request_letter_file_size) : null,
      accepted_booking_id: row.accepted_booking_id !== null ? Number(row.accepted_booking_id) : null,
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
