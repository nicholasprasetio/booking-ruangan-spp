import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid permission ID' })
  }

  const existing = await env.DB.prepare(`SELECT id FROM permissions WHERE id = ?`).bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Permission tidak ditemukan' })
  }

  // Delete associated role_permissions first
  await env.DB.prepare(`DELETE FROM role_permissions WHERE permission_id = ?`).bind(id).run()
  await env.DB.prepare(`DELETE FROM permissions WHERE id = ?`).bind(id).run()

  return { ok: true }
})
