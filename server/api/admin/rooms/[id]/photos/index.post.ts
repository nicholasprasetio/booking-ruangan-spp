import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getCloudflareEnv } from '../../../../../utils/cf-env'
import { requireAuth } from '../../../../../utils/auth'
import { requireRole } from '../../../../../utils/roles'

const MAX_PHOTO_BYTES = 6 * 1024 * 1024
const PHOTO_DIR = '/home/jelastic/ROOT/uploads/room-photos'

function extensionForType(type: string | undefined) {
  if (type === 'image/jpeg') return 'jpg'
  if (type === 'image/png') return 'png'
  if (type === 'image/webp') return 'webp'
  if (type === 'image/gif') return 'gif'
  return 'bin'
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)

  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid room ID' })
  }

  const existing = await env.DB.prepare(
    `SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  const parts = await readMultipartFormData(event)
  if (!parts || parts.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No files uploaded' })
  }

  await fs.mkdir(PHOTO_DIR, { recursive: true })

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const savedPhotos: Array<{ id: number; url: string; created_at: string }> = []

  for (const part of parts) {
    if (part.name !== 'files' || !part.data) continue

    if (part.data.length > MAX_PHOTO_BYTES) {
      throw createError({
        statusCode: 400,
        statusMessage: 'File too large (max 6MB)',
      })
    }

    if (!part.type || !part.type.startsWith('image/')) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Only image files are allowed',
      })
    }

    const ext = extensionForType(part.type)
    const filename = `${crypto.randomUUID()}.${ext}`
    const relativePath = `room-photos/${filename}`
    const absolutePath = path.join(PHOTO_DIR, filename)

    try {
      await fs.writeFile(absolutePath, part.data)

      const result = await env.DB.prepare(
        `INSERT INTO room_photos
         (room_id, object_key, content_type, byte_size, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(
          id,
          relativePath,
          part.type,
          part.data.length,
          now,
        )
        .run()

      savedPhotos.push({
        id: result.meta.last_row_id,
        url: `/api/rooms/photos/${result.meta.last_row_id}`,
        created_at: now,
      })
    } catch (error) {
      await fs.rm(absolutePath, { force: true }).catch(() => undefined)
      throw error
    }
  }

  if (savedPhotos.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No valid image files uploaded',
    })
  }

  return {
    ok: true,
    photos: savedPhotos,
  }
})
