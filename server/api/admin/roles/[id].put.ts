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
    throw createError({ statusCode: 400, statusMessage: 'Invalid role ID' })
  }

  const body = await readBody<{ name?: string }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim().toLowerCase() : ''

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Nama role wajib diisi' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM roles WHERE id = ? AND deleted_at IS NULL`
  ).bind(id).first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Role tidak ditemukan' })
  }

  // Check duplicate name
  const duplicate = await env.DB.prepare(
    `SELECT id FROM roles WHERE name = ? AND id != ? AND deleted_at IS NULL`
  ).bind(name, id).first()

  if (duplicate) {
    throw createError({ statusCode: 400, statusMessage: 'Nama role sudah digunakan' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  await env.DB.prepare(
    `UPDATE roles SET name = ?, updated_at = ? WHERE id = ?`
  ).bind(name, now, id).run()

  return { ok: true }
})
