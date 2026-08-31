import { createError, readBody } from 'h3'
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

  const body = await readBody<{ permission_ids?: number[] }>(event)
  const permissionIds = Array.isArray(body?.permission_ids) ? body.permission_ids.filter(n => typeof n === 'number') : []

  // Clear all existing permissions for this role
  await env.DB.prepare(`DELETE FROM role_permissions WHERE role_id = ?`).bind(id).run()

  // Insert new permissions
  if (permissionIds.length > 0) {
    const stmts = permissionIds.map(pid =>
      env.DB.prepare(
        `INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)`
      ).bind(id, pid)
    )
    await env.DB.batch(stmts)
  }

  return { ok: true }
})
