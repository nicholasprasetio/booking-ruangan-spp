import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { requireRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)

  const start = typeof q.start === 'string' ? q.start.trim() : ''
  const end = typeof q.end === 'string' ? q.end.trim() : ''
  const roomId = q.room_id ? Number(q.room_id) : null

  if (!start || !end) {
    throw createError({ statusCode: 400, statusMessage: 'start and end date parameters are required' })
  }

  const conditions: string[] = [
    'b.deleted_at IS NULL',
    'r.deleted_at IS NULL',
    "bo.status IN ('pending', 'approved')",
    'bos.start_at < ?',
    'bos.end_at > ?',
  ]

  const startISO = `${start}T00:00:00.000Z`
  const endISO = `${end}T23:59:59.999Z`
  const binds: unknown[] = [endISO, startISO]

  if (roomId) {
    conditions.push('COALESCE(bo.room_id, b.room_id) = ?')
    binds.push(roomId)
  }

  const whereSql = conditions.join(' AND ')

  const results = await env.DB
    .prepare(
      `SELECT
          bo.id as occurrence_id,
          bo.status as occurrence_status,
          b.id as booking_id,
          b.activity_name,
          b.participant_count,
          b.status as booking_status,
          b.user_id,
          COALESCE(b.external_requester_name, u.fullname) AS user_name,
          COALESCE(oroom.id, r.id) AS room_id,
          COALESCE(oroom.name, r.name) AS room_name,
          bos.start_at,
          bos.end_at
       FROM booking_occurrence_slots bos
       JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
       JOIN bookings b ON b.id = bo.booking_id
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN rooms oroom ON oroom.id = bo.room_id
       JOIN users u ON u.id = b.user_id
       WHERE ${whereSql}
       ORDER BY bos.start_at ASC
       LIMIT 4000`,
    )
    .bind(...binds)
    .all<{
      occurrence_id: number
      occurrence_status: string
      booking_id: number
      activity_name: string | null
      participant_count: number | null
      booking_status: string
      user_id: number
      user_name: string | null
      room_id: number
      room_name: string | null
      start_at: string
      end_at: string
    }>()

  const events = (results.results || []).map((row) => ({
    id: row.occurrence_id,
    booking_id: row.booking_id,
    title: `${row.activity_name || 'Peminjaman'} - ${row.room_name || 'Room'}`,
    start: row.start_at,
    end: row.end_at,
    room_id: row.room_id,
    room_name: row.room_name,
    status: row.occurrence_status,
    booking_status: row.booking_status,
    user_name: row.user_name,
    activity_name: row.activity_name,
    participant_count: row.participant_count,
  }))

  return { ok: true, data: events }
})
