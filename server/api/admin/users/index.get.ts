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
  const search = typeof q.search === 'string' ? q.search.trim() : ''

  const conditions: string[] = ['u.deleted_at IS NULL']
  const binds: unknown[] = []

  if (search) {
    conditions.push('(u.fullname LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ? OR u.username LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
  }

  const whereSql = conditions.join(' AND ')

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) as total
     FROM users u
     WHERE ${whereSql}`,
  )
    .bind(...binds)
    .first<{ total: number }>()

  const users = await env.DB.prepare(
    `SELECT
        u.id,
        u.fullname,
        u.username,
        u.phone_number,
        u.email,
        u.created_at,
        u.updated_at
     FROM users u
     WHERE ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
  )
     .bind(...binds)
    .all<{
      id: number
      fullname: string | null
      username: string | null
      phone_number: string | null
      email: string | null
      created_at: string | null
      updated_at: string | null
    }>()

  // Fetch roles for each user from user_roles
  const enriched = []
  for (const u of users.results) {
    const roles = await env.DB.prepare(
      `SELECT r.id as role_id, r.name as role_name
       FROM user_roles ur
       JOIN roles r ON r.id = ur.role_id
       WHERE ur.user_id = ? AND r.deleted_at IS NULL
       ORDER BY r.id`
    ).bind(u.id).all<{ role_id: number; role_name: string }>()
    enriched.push({
      ...u,
      role_ids: roles.results.map(r => r.role_id),
      role_names: roles.results.map(r => r.role_name),
      // Backwards compat
      role_id: roles.results[0]?.role_id ?? null,
      role_name: roles.results[0]?.role_name ?? null,
    })
  }

  const total = totalRow?.total || 0
  return {
    ok: true,
    data: enriched,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
