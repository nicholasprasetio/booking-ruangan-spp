import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  if (!id || isNaN(Number(id))) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid room ID' })
  }

  // Check if room exists
  const existing = await env.DB.prepare(
    `SELECT id FROM rooms WHERE id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .first()

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found' })
  }

  // Check if room has active bookings
  const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')
  const activeBookings = await env.DB.prepare(
    `SELECT COUNT(*) as count
     FROM booking_slots bs
     JOIN bookings b ON b.id = bs.booking_id
     WHERE b.room_id = ?
       AND b.deleted_at IS NULL
       AND b.status IN ('pending', 'approved')
       AND bs.end_at >= ?2`,
  )
    .bind(id, nowIso)
    .first<{ count: number }>()

  if (activeBookings && activeBookings.count > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Cannot delete room with active or pending bookings',
    })
  }

  // Soft delete
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  await env.DB.prepare(
    `UPDATE rooms
     SET deleted_at = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(now, now, id)
    .run()

  const photos = await env.DB.prepare(
    `SELECT id, object_key
     FROM room_photos
     WHERE room_id = ? AND deleted_at IS NULL`,
  )
    .bind(id)
    .all<{ id: number; object_key: string }>()

  if (photos.results.length > 0) {
    const bucket = env.ROOM_PHOTOS
    if (bucket) {
      for (const photo of photos.results) {
        await bucket.delete(photo.object_key)
      }
    }
    await env.DB.prepare(
      `UPDATE room_photos
       SET deleted_at = ?
       WHERE room_id = ?`,
    )
      .bind(now, id)
      .run()
  }

  return { ok: true, message: 'Room deleted successfully' }
})
