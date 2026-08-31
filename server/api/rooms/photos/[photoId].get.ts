import { promises as fs } from 'node:fs'
import path from 'node:path'
import { getCloudflareEnv } from '../../../utils/cf-env'

const PHOTO_DIR = '/home/jelastic/ROOT/uploads/room-photos'

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)

  const photoId = getRouterParam(event, 'photoId')
  if (!photoId || isNaN(Number(photoId))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid photo ID' })
  }

  const photo = await env.DB.prepare(
    `SELECT object_key, content_type
     FROM room_photos
     WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(photoId)
    .first<{ object_key: string; content_type: string | null }>()

  if (!photo) {
    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })
  }

  const filename = path.basename(photo.object_key)
  const filePath = path.join(PHOTO_DIR, filename)

  try {
    const data = await fs.readFile(filePath)

    return new Response(data, {
      headers: {
        'Content-Type': photo.content_type || 'application/octet-stream',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    throw createError({ statusCode: 404, statusMessage: 'Photo file not found' })
  }
})
