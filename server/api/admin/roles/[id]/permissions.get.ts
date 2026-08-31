import { createError } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM roles WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Role tidak ditemukan' })
  }

  const permissions = await env.DB.prepare(
    `SELECT p.id, p.code, p.name, p.description, p.category, p.default_granted,
       CASE WHEN rp.id IS NOT NULL THEN 1 ELSE 0 END AS granted
     FROM permissions p
     LEFT JOIN role_permissions rp ON rp.permission_id = p.id AND rp.role_id = ?
     ORDER BY p.category, p.code`
  ).bind(id).all()

  return {
    ok: true,
    data: permissions.results,
  }
})
