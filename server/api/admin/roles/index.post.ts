import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody<{ name?: string }>(event)

  const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase() : ''
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nama role wajib diisi' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM roles WHERE name = ? AND deleted_at IS NULL`
  ).bind(name).first()

  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'Nama role sudah ada' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const result = await env.DB.prepare(
    `INSERT INTO roles (name, created_at, updated_at) VALUES (?, ?, ?)`
  ).bind(name, now, now).run()

  const newRoleId = result.meta.last_row_id

  // Auto-assign permissions with default_granted = 1
  const defaultPerms = await env.DB.prepare(
    `SELECT id FROM permissions WHERE default_granted = 1`
  ).all<{ id: number }>()

  if (defaultPerms.results && defaultPerms.results.length > 0) {
    const stmts = defaultPerms.results.map(p =>
      env.DB.prepare(
        `INSERT INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, ?)`
      ).bind(newRoleId, p.id, now)
    )
    await env.DB.batch(stmts)
  }

  return { ok: true, id: newRoleId }
})
