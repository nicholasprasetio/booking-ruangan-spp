import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { hashPassword } from '../../../../utils/password'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid user ID' })
  }

  const body = await readBody<{ password?: string }>(event)
  const password = typeof body?.password === 'string' ? body.password : ''
  if (!password || password.trim().length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password minimal 6 karakter' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM users WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const hashed = await hashPassword(password.trim())
  await env.DB.prepare(
    `UPDATE users
     SET password = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(hashed, now, id)
    .run()

  return { ok: true }
})
