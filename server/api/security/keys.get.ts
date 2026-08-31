import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { requirePermission } from '../../utils/permissions'
import { nowIso } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  await requirePermission(event, env.DB, auth, 'menu.security_keys')

  const q = getQuery(event)
  const hoursAhead = Math.max(1, Math.min(24, Number(q.hoursAhead || 8) || 8))
  const now = nowIso()
  const until = new Date(new Date(now).getTime() + hoursAhead * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

  const rows = await env.DB.prepare(
    `SELECT
        kt.id,
        kt.token,
        kt.picked_up_at,
        kt.returned_at,
        kt.created_at,
        bo.id AS occurrence_id,
        bo.status AS occurrence_status,
        bo.start_at,
        bo.end_at,
        b.id AS booking_id,
        b.activity_name,
        COALESCE(b.external_requester_name, u.fullname) AS requester_name,
        COALESCE(oroom.id, r.id) AS room_id,
        COALESCE(oroom.name, r.name) AS room_name,
        pickup.fullname AS picked_up_by_name,
        ret.fullname AS returned_by_name
     FROM booking_key_tokens kt
     JOIN booking_occurrences bo ON bo.id = kt.occurrence_id
     JOIN bookings b ON b.id = kt.booking_id
     JOIN rooms r ON r.id = b.room_id
     LEFT JOIN rooms oroom ON oroom.id = bo.room_id
     JOIN users u ON u.id = b.user_id
     LEFT JOIN users pickup ON pickup.id = kt.picked_up_by
     LEFT JOIN users ret ON ret.id = kt.returned_by
     WHERE b.deleted_at IS NULL
       AND bo.status = 'approved'
       AND (
         (kt.picked_up_at IS NOT NULL AND kt.returned_at IS NULL)
         OR (bo.end_at >= ?1 AND bo.start_at <= ?2)
       )
     ORDER BY
       CASE WHEN kt.picked_up_at IS NOT NULL AND kt.returned_at IS NULL THEN 0 ELSE 1 END,
       bo.start_at ASC
     LIMIT 300`,
  )
    .bind(now, until)
    .all()

  return {
    ok: true,
    now,
    until,
    data: rows.results || [],
  }
})
