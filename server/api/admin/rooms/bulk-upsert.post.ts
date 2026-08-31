import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody(event)

  const rooms: Array<{
    name: string
    location?: string | null
    capacity?: number | null
    description?: string | null
    open_time_start?: string | null
    open_time_end?: string | null
    slot_minutes?: number | null
    available_for_booking?: boolean | null
  }> = body?.rooms

  if (!Array.isArray(rooms) || rooms.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'rooms must be a non-empty array' })
  }
  if (rooms.length > 100) {
    throw createError({ statusCode: 400, statusMessage: 'Maximum 100 rooms per batch' })
  }

  let created = 0
  let updated = 0
  const failed: Array<{ index: number; reason: string }> = []
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')

  for (let i = 0; i < rooms.length; i++) {
    const room = rooms[i]
    try {
      const name = room.name?.trim()
      if (!name) {
        failed.push({ index: i, reason: 'Nama ruangan wajib diisi' })
        continue
      }

      const location = room.location?.trim() || null
      const description = room.description?.trim() || null
      const capacity = room.capacity !== null && room.capacity !== undefined ? Number(room.capacity) : null
      const slot_minutes = room.slot_minutes !== null && room.slot_minutes !== undefined ? Number(room.slot_minutes) : null
      const open_time_start = room.open_time_start || null
      const open_time_end = room.open_time_end || null
      const available_for_booking = room.available_for_booking === false ? 0 : 1

      // Validate capacity
      if (capacity !== null && (!Number.isFinite(capacity) || capacity < 1)) {
        failed.push({ index: i, reason: 'Kapasitas harus angka >= 1' })
        continue
      }

      // Validate slot_minutes
      if (slot_minutes !== null && (!Number.isFinite(slot_minutes) || slot_minutes < 15)) {
        failed.push({ index: i, reason: 'Slot minimal 15 menit' })
        continue
      }

      // Validate times
      if ((open_time_start && !open_time_end) || (!open_time_start && open_time_end)) {
        failed.push({ index: i, reason: 'Jam buka dan tutup harus diisi bersamaan' })
        continue
      }
      if (open_time_start && !/^\d{2}:\d{2}$/.test(open_time_start)) {
        failed.push({ index: i, reason: 'Format jam buka tidak valid (HH:MM)' })
        continue
      }
      if (open_time_end && !/^\d{2}:\d{2}$/.test(open_time_end)) {
        failed.push({ index: i, reason: 'Format jam tutup tidak valid (HH:MM)' })
        continue
      }
      if (open_time_start && open_time_end) {
        const [sh, sm] = open_time_start.split(':').map(Number)
        const [eh, em] = open_time_end.split(':').map(Number)
        if (sh * 60 + sm >= eh * 60 + em) {
          failed.push({ index: i, reason: 'Jam tutup harus setelah jam buka' })
          continue
        }
      }

      // Check if room with same name exists (case-insensitive)
      const existing = await env.DB.prepare(
        `SELECT id FROM rooms WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL`,
      )
        .bind(name)
        .first<{ id: number }>()

      if (existing) {
        // Update
        await env.DB.prepare(
          `UPDATE rooms
           SET name = ?, location = ?, capacity = ?, description = ?,
               open_time_start = ?, open_time_end = ?, slot_minutes = ?, available_for_booking = ?, updated_at = ?
           WHERE id = ?`,
        )
          .bind(name, location, capacity, description, open_time_start, open_time_end, slot_minutes, available_for_booking, now, existing.id)
          .run()
        updated++
      } else {
        // Create
        await env.DB.prepare(
          `INSERT INTO rooms (name, location, capacity, description, open_time_start, open_time_end, slot_minutes, available_for_booking, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(name, location, capacity, description, open_time_start, open_time_end, slot_minutes, available_for_booking, now, now)
          .run()
        created++
      }
    } catch (e: any) {
      failed.push({ index: i, reason: e?.message || 'Unknown error' })
    }
  }

  return { ok: true, created, updated, failed }
})
