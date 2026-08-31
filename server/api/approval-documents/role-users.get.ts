import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const env = getCloudflareEnv(event)

  const q = getQuery(event)
  const roleId = typeof q.role_id === 'string' ? Number(q.role_id) : null

  if (!roleId || isNaN(roleId)) {
    throw createError({ statusCode: 400, statusMessage: 'role_id wajib diisi' })
  }

  const users = await env.DB.prepare(
    `SELECT u.id, u.fullname, u.email, u.phone_number
     FROM users u
     JOIN user_roles ur ON ur.user_id = u.id
     WHERE ur.role_id = ? AND u.deleted_at IS NULL
     ORDER BY u.fullname`
  ).bind(roleId).all()

  return {
    data: users.results,
  }
})
