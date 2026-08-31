import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody(event)

  const ids: number[] = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'ids must be a non-empty array' })
  }
  if (ids.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 100 rooms per batch' })
  }

  const deleted: number[] = []
  const failed: Array<{ id: number; reason: string }> = []
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const nowIso = now.replace(/\.\d{3}Z$/, 'Z')

  for (const id of ids) {
    if (!Number.isFinite(id) || id <= 0) {
      failed.push({ id, reason: 'Invalid room ID' })
      continue
    }

    // Check room exists
    const existing = await env.DB.prepare(
      `SELECT id, name FROM rooms WHERE id = ? AND deleted_at IS NULL`,
    )
      .bind(id)
      .first<{ id: number; name: string }>()

    if (!existing) {
      failed.push({ id, reason: 'Room not found' })
      continue
    }

    // Check active bookings
    const activeBookings = await env.DB.prepare(
      `SELECT COUNT(*) as count
       FROM booking_slots bs
       JOIN bookings b ON b.id = bs.booking_id
       WHERE b.room_id = ?
         AND b.deleted_at IS NULL
         AND b.status IN ('pending', 'approved')
         AND bs.end_at >= ?`,
    )
      .bind(id, nowIso)
      .first<{ count: number }>()

    if (activeBookings && activeBookings.count > 0) {
      failed.push({ id, reason: `Ruangan "${existing.name}" memiliki peminjaman aktif` })
      continue
    }

    // Soft delete room
    await env.DB.prepare(
      `UPDATE rooms SET deleted_at = ?, updated_at = ? WHERE id = ?`,
    )
      .bind(now, now, id)
      .run()

    // Soft delete photos
    const photos = await env.DB.prepare(
      `SELECT id, object_key FROM room_photos WHERE room_id = ? AND deleted_at IS NULL`,
    )
      .bind(id)
      .all<{ id: number; object_key: string }>()

    if (photos.results.length > 0) {
      const bucket = env.R2
      if (bucket) {
        for (const photo of photos.results) {
          try { await bucket.delete(photo.object_key) } catch { /* ignore */ }
        }
      }
      await env.DB.prepare(
        `UPDATE room_photos SET deleted_at = ? WHERE room_id = ?`,
      )
        .bind(now, id)
        .run()
    }

    deleted.push(id)
  }

  return { ok: true, deleted, failed }
})
