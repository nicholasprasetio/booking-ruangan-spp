import { createError, readBody } from 'h3'
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

  const body = await readBody<{ name?: string; description?: string; category?: string; default_granted?: boolean }>(event)

  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const description = typeof body?.description === 'string' ? body.description.trim() : ''
  const category = typeof body?.category === 'string' ? body.category.trim() : ''
  const defaultGranted = body?.default_granted ? 1 : 0

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nama permission wajib diisi' })
  }

  const existing = await env.DB.prepare(`SELECT id FROM permissions WHERE id = ?`).bind(id).first()
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Permission tidak ditemukan' })
  }

  await env.DB.prepare(
    `UPDATE permissions SET name = ?, description = ?, category = ?, default_granted = ? WHERE id = ?`
  ).bind(name, description || null, category || null, defaultGranted, id).run()

  return { ok: true }
})
