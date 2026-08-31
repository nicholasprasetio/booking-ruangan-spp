import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'

const ALLOWED_STATUSES = new Set(['pending', 'approved', 'rejected', 'completed', 'canceled'])

function parseStatusFilters(raw: string | null): string[] {
  if (!raw) return ['pending', 'approved']

  const values = raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)

  const unique = Array.from(new Set(values))
  if (!unique.length) return ['pending', 'approved']

  for (const status of unique) {
    if (!ALLOWED_STATUSES.has(status)) {
      throw createError({ statusCode: 400, statusMessage: `Invalid status filter: ${status}` })
    }
  }

  return unique
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const q = getQuery(event)

  const start = typeof q.start === 'string' ? q.start.trim() : ''
  const end = typeof q.end === 'string' ? q.end.trim() : ''

  if (!start || !end) {
    throw createError({ statusCode: 400, statusMessage: 'start and end date parameters are required' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date range (expected YYYY-MM-DD)' })
  }

  const statuses = parseStatusFilters(typeof q.status === 'string' ? q.status : null)
  const endISO = `${end}T23:59:59.999Z`
  const startISO = `${start}T00:00:00.000Z`

  const statusPlaceholders = statuses.map((_, idx) => `?${idx + 4}`).join(', ')
  const rows = await env.DB
    .prepare(
      `SELECT
          bo.id as occurrence_id,
          bo.status as occurrence_status,
          bo.start_at,
          bo.end_at,
          bo.occurrence_date,
          b.id as booking_id,
          b.status as booking_status,
          COALESCE(bo.room_id, b.room_id) AS room_id,
          b.activity_name,
          b.participant_count,
          b.is_recurring,
          b.series_id,
          COALESCE(oroom.name, r.name) as room_name
       FROM booking_occurrences bo
       JOIN bookings b ON b.id = bo.booking_id
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN rooms oroom ON oroom.id = bo.room_id
       WHERE b.user_id = ?1
         AND b.deleted_at IS NULL
         AND bo.start_at < ?2
         AND bo.end_at > ?3
         AND bo.status IN (${statusPlaceholders})
       ORDER BY bo.start_at ASC
       LIMIT 3000`,
    )
    .bind(Number(auth.sub), endISO, startISO, ...statuses)
    .all<{
      occurrence_id: number
      occurrence_status: string
      start_at: string
      end_at: string
      occurrence_date: string
      booking_id: number
      booking_status: string
      room_id: number
      activity_name: string | null
      participant_count: number | null
      is_recurring: number
      series_id: number | null
      room_name: string | null
    }>()

  return {
    ok: true,
    data: (rows.results || []).map((row) => ({
      id: Number(row.occurrence_id),
      booking_id: Number(row.booking_id),
      status: row.occurrence_status,
      booking_status: row.booking_status,
      start: row.start_at,
      end: row.end_at,
      occurrence_date: row.occurrence_date,
      room_id: Number(row.room_id),
      room_name: row.room_name,
      activity_name: row.activity_name,
      participant_count: row.participant_count,
      is_recurring: Number(row.is_recurring || 0) === 1,
      series_id: row.series_id,
    })),
  }
})
