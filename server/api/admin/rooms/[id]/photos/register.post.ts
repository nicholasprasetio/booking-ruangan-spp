import { getCloudflareEnv } from '../../../../../utils/cf-env'
import { requireAuth } from '../../../../../utils/auth'
import { requireRole } from '../../../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  const id = getRouterParam(event, 'id')
  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid room ID' })
  }

  const body = await readBody<{ objectKey: string; contentType: string; byteSize?: number }>(event)

  if (!body?.objectKey || typeof body.objectKey !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'objectKey is required' })
  }

  // Sanitise: only accept keys that look like our generated upload paths
  if (!/^[a-z0-9/_-]+\.[a-z]{2,4}$/i.test(body.objectKey)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid objectKey format' })
  }

  // Verify the object actually exists in R2 (prevents registering arbitrary keys)
  const head = await env.R2.head(body.objectKey)
  if (!head) {
    throw createError({ statusCode: 404, statusMessage: 'Object not found in R2. Upload the file first.' })
  }

  const room = await env.DB.prepare(
    `SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const contentType = body.contentType || head.httpMetadata?.contentType || 'application/octet-stream'
  const byteSize = body.byteSize ?? head.size ?? 0

  const result = await env.DB.prepare(
    `INSERT INTO room_photos (room_id, object_key, content_type, byte_size, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(id, body.objectKey, contentType, byteSize, now)
    .run()

  return {
    ok: true,
    photo: {
      id: result.meta.last_row_id,
      url: `/api/rooms/photos/${result.meta.last_row_id}`,
      created_at: now,
    },
  }
})
