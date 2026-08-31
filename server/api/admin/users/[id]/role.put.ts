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
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  if (Number(auth.sub) === Number(id)) {
    throw createError({ statusCode: 400, statusMessage: 'Tidak bisa mengubah role akun sendiri' })
  }

  const body = await readBody<{ roles?: string[] }>(event)
  const roleNames = Array.isArray(body?.roles) ? body.roles.map(r => String(r).trim().toLowerCase()).filter(Boolean) : []
  if (roleNames.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Minimal satu role wajib diisi' })
  }

  // Validate all role names exist
  const roleRows: { id: number; name: string }[] = []
  for (const name of roleNames) {
    const row = await env.DB.prepare(
      `SELECT id, name FROM roles WHERE name = ? AND deleted_at IS NULL LIMIT 1`
    ).bind(name).first<{ id: number; name: string }>()
    if (!row) {
      throw createError({ statusCode: 400, statusMessage: `Role "${name}" tidak valid` })
    }
    roleRows.push(row)
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')

  // Update user_roles: delete all then re-insert
  await env.DB.prepare(`DELETE FROM user_roles WHERE user_id = ?`).bind(id).run()
  const stmts = roleRows.map(r =>
    env.DB.prepare(`INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)`).bind(id, r.id, now)
  )
  if (stmts.length > 0) {
    await env.DB.batch(stmts)
  }

  return { ok: true }
})
