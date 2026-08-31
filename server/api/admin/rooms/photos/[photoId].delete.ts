import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'

const PHOTO_DIR = '/home/jelastic/ROOT/uploads/room-photos'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)

  const photoId = getRouterParam(event, 'photoId')
  if (!photoId || isNaN(Number(photoId))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo ID' })
  }

  const photo = await env.DB.prepare(
    `SELECT id, object_key
     FROM room_photos
     WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(photoId)
    .first<{ id: number; object_key: string }>()

  if (!photo) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  const filename = path.basename(photo.object_key)
  const filePath = path.join(PHOTO_DIR, filename)

  await fs.rm(filePath, { force: true })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')

  await env.DB.prepare(
    `UPDATE room_photos
     SET deleted_at = ?
     WHERE id = ?`,
  )
    .bind(now, photoId)
    .run()

  return { ok: true }
})
