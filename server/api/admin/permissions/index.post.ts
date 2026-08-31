import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody<{ code?: string; name?: string; description?: string; category?: string; default_granted?: boolean }>(event)

  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const category = typeof body?.category === 'string' ? body.category.trim() : ''
  const defaultGranted = body?.default_granted ? 1 : 0

  if (!code || !name) {
    throw createError({ statusCode: 400, statusMessage: 'Code dan nama permission wajib diisi' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM permissions WHERE code = ?`
  ).bind(code).first()

  if (existing) {
    throw createError({ statusCode: 400, statusMessage: 'Permission code sudah ada' })
  }

  const result = await env.DB.prepare(
    `INSERT INTO permissions (code, name, description, category, default_granted, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(code, name, description || null, category || null, defaultGranted).run()

  return { ok: true, id: result.meta.last_row_id }
})
