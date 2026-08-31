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
    throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' })
  }

  const existing = await env.DB.prepare(
    `SELECT id, name FROM roles WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first<{ id: number; name: string }>()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Role tidak ditemukan' })
  }

  // Prevent deleting built-in roles
  if (existing.name === 'admin' || existing.name === 'user') {
    throw createError({ statusCode: 400, statusMessage: 'Tidak bisa menghapus role bawaan' })
  }

  // Check if any users have this role
  const userCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.role_id = ? AND u.deleted_at IS NULL`
  ).bind(id).first<{ cnt: number }>()

  if (userCount && userCount.cnt > 0) {
    throw createError({ statusCode: 400, statusMessage: `Role masih digunakan oleh ${userCount.cnt} pengguna` })
  }

  // Soft delete
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  await env.DB.prepare(`DELETE FROM role_permissions WHERE role_id = ?`).bind(id).run()
  await env.DB.prepare(`UPDATE roles SET deleted_at = ? WHERE id = ?`).bind(now, id).run()

  return { ok: true }
})
