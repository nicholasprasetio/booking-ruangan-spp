import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { deriveCombinedMetadata, nowDb, validateCombinedMemberIds } from '../../../../utils/combined-rooms'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])
  const roomId = Number(getRouterParam(event, 'id'))
  if (!roomId) throw createError({ statusCode: 400, statusMessage: 'Invalid room ID' })
  const body = await readBody<{ name?: string; memberRoomIds?: unknown[]; available_for_booking?: boolean }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Nama ruangan gabungan wajib diisi' })
  const env = getCloudflareEnv(event)
  const room = await env.DB.prepare('SELECT id FROM rooms WHERE id = ?1 AND deleted_at IS NULL AND COALESCE(is_combined, 0) = 1').bind(roomId).first()
  if (!room) throw createError({ statusCode: 404, statusMessage: 'Ruangan gabungan tidak ditemukan' })
  const active = await env.DB.prepare(
    `SELECT bo.id FROM booking_occurrences bo JOIN bookings b ON b.id = bo.booking_id
     WHERE COALESCE(bo.room_id, b.room_id) = ?1 AND b.deleted_at IS NULL AND bo.status IN ('pending','approved') AND bo.end_at >= ?2 LIMIT 1`,
  ).bind(roomId, nowDb()).first()
  if (active) throw createError({ statusCode: 409, statusMessage: 'Anggota ruangan gabungan tidak dapat diubah selama masih ada booking aktif atau mendatang' })
  const memberIds = Array.isArray(body?.memberRoomIds) ? body.memberRoomIds : []
  const members = await validateCombinedMemberIds(env.DB, memberIds)
  const metadata = deriveCombinedMetadata(members)
  const at = nowDb()
  await env.DB.batch([
    env.DB.prepare('DELETE FROM room_combined_members WHERE combined_room_id = ?1').bind(roomId),
    ...members.map((member) => env.DB.prepare('INSERT INTO room_combined_members (combined_room_id, member_room_id, created_at) VALUES (?1, ?2, ?3)').bind(roomId, member.id, at)),
    env.DB.prepare(
      `UPDATE rooms SET name = ?2, location = ?3, capacity = ?4, open_time_start = ?5, open_time_end = ?6, slot_minutes = ?7,
       available_for_booking = ?8, updated_at = ?9 WHERE id = ?1`,
    ).bind(roomId, name, metadata.location, metadata.capacity, metadata.open_time_start, metadata.open_time_end, metadata.slot_minutes, body?.available_for_booking === false ? 0 : 1, at),
  ])
  return { ok: true, room: { id: roomId, name, ...metadata, is_combined: 1, member_room_ids: members.map((member) => member.id) } }
})
