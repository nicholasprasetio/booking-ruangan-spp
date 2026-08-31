import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { requirePermission } from '../../utils/permissions'
import { nowIso } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  await requirePermission(event, env.DB, auth, 'menu.security_keys')

  const body = await readBody<{ token?: string }>(event)
  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) throw createError({ statusCode: 400, statusMessage: 'QR token is required' })

  const row = await env.DB.prepare(
    `SELECT
        kt.*,
        bo.status AS occurrence_status,
        bo.start_at,
        bo.end_at,
        b.activity_name,
        COALESCE(oroom.name, r.name) AS room_name
     FROM booking_key_tokens kt
     JOIN booking_occurrences bo ON bo.id = kt.occurrence_id
     JOIN bookings b ON b.id = kt.booking_id
     JOIN rooms r ON r.id = b.room_id
     LEFT JOIN rooms oroom ON oroom.id = bo.room_id
     WHERE kt.token = ?1
     LIMIT 1`,
  )
    .bind(token)
    .first<any>()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'QR token tidak valid' })
  if (row.occurrence_status !== 'approved') {
    throw createError({ statusCode: 409, statusMessage: 'Sesi peminjaman belum/tidak disetujui' })
  }
  if (row.picked_up_at && row.returned_at) {
    throw createError({ statusCode: 409, statusMessage: 'Kunci untuk sesi ini sudah dikembalikan' })
  }

  const at = nowIso()
  const action = row.picked_up_at ? 'returned' : 'picked_up'

  await env.DB.batch([
    env.DB.prepare(
      action === 'picked_up'
        ? `UPDATE booking_key_tokens
           SET picked_up_at = ?2, picked_up_by = ?3, updated_at = ?2
           WHERE id = ?1`
        : `UPDATE booking_key_tokens
           SET returned_at = ?2, returned_by = ?3, updated_at = ?2
           WHERE id = ?1`,
    ).bind(row.id, at, Number(auth.sub)),
    env.DB.prepare(
      `INSERT INTO booking_key_events (key_token_id, booking_id, occurrence_id, actor_user_id, type, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(row.id, row.booking_id, row.occurrence_id, Number(auth.sub), action, at),
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`,
    ).bind(
      row.booking_id,
      row.occurrence_id,
      Number(auth.sub),
      action === 'picked_up' ? 'key_picked_up' : 'key_returned',
      JSON.stringify({ roomName: row.room_name }),
      at,
    ),
  ])

  return {
    ok: true,
    action,
    scanned_at: at,
    booking_id: Number(row.booking_id),
    occurrence_id: Number(row.occurrence_id),
    room_name: row.room_name,
    activity_name: row.activity_name,
    start_at: row.start_at,
    end_at: row.end_at,
  }
})
