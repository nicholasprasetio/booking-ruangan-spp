import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { deriveCombinedMetadata, nowDb, validateCombinedMemberIds } from '../../../utils/combined-rooms'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])
  const body = await readBody<{ name?: string; memberRoomIds?: unknown[]; available_for_booking?: boolean }>(event)
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name) throw createError({ statusCode: 400, statusMessage: 'Nama ruangan gabungan wajib diisi' })
  const env = getCloudflareEnv(event)
  const memberIds = Array.isArray(body?.memberRoomIds) ? body.memberRoomIds : []
  const members = await validateCombinedMemberIds(env.DB, memberIds)
  const metadata = deriveCombinedMetadata(members)
  const at = nowDb()
  const created = await env.DB.prepare(
    `INSERT INTO rooms (name, location, capacity, description, open_time_start, open_time_end, slot_minutes, available_for_booking, is_combined, created_at, updated_at)
     VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6, ?7, 1, ?8, ?8)`,
  ).bind(name, metadata.location, metadata.capacity, metadata.open_time_start, metadata.open_time_end, metadata.slot_minutes, body?.available_for_booking === false ? 0 : 1, at).run()
  const roomId = Number(created.meta.last_row_id)
  await env.DB.batch(members.map((member) => env.DB.prepare(
    'INSERT INTO room_combined_members (combined_room_id, member_room_id, created_at) VALUES (?1, ?2, ?3)',
  ).bind(roomId, member.id, at)))
  return { ok: true, room: { id: roomId, name, ...metadata, is_combined: 1, member_room_ids: members.map((member) => member.id) } }
})
