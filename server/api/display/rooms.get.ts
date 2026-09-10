import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { requirePermission, userHasPermission } from '../../utils/permissions'
import { hasRole } from '../../utils/roles'
import { nowIso } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const canDisplay = hasRole(auth, 'admin') || await userHasPermission(env.DB, auth.sub, 'menu.display_rooms')
  if (!canDisplay) {
    await requirePermission(event, env.DB, auth, 'menu.security_keys')
  }

  const q = getQuery(event)
  const hoursAhead = Math.max(1, Math.min(24, Number(q.hoursAhead || 6) || 6))
  const now = nowIso()



  function addMinutesToWibDatetime(value: string, minutes: number): string {

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)

    if (!match) throw new Error(`Invalid WIB datetime: ${value}`)



    const [, y, mo, d, h, mi, se] = match

    const base = Date.UTC(

      Number(y),

      Number(mo) - 1,

      Number(d),

      Number(h),

      Number(mi),

      Number(se),

    )

    const next = new Date(base + minutes * 60 * 1000)



    const pad = (n: number) => String(n).padStart(2, '0')



    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())} ${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`

  }



  const until = addMinutesToWibDatetime(now, hoursAhead * 60)

  const rows = await env.DB.prepare(
    `SELECT
        bo.id AS occurrence_id,
        bos.start_at,
        bos.end_at,
        b.id AS booking_id,
        b.activity_name,
        b.participant_count,
        COALESCE(b.external_requester_name, u.fullname) AS requester_name,
        COALESCE(oroom.id, r.id) AS room_id,
        COALESCE(oroom.name, r.name) AS room_name,
        COALESCE(oroom.location, r.location) AS room_location
     FROM booking_occurrence_slots bos
     JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
     JOIN bookings b ON b.id = bo.booking_id
     JOIN rooms r ON r.id = b.room_id
     LEFT JOIN rooms oroom ON oroom.id = bo.room_id
     JOIN users u ON u.id = b.user_id
     WHERE b.deleted_at IS NULL
       AND bo.status = 'approved'
       AND bos.end_at > ?1
       AND bos.start_at <= ?2
     ORDER BY bos.start_at ASC, r.name ASC
     LIMIT 100`,
  )
    .bind(now, until)
    .all<any>()

  return {
    ok: true,
    now,
    until,
    hoursAhead,
    data: (rows.results || []).map((row) => ({
      ...row,
      is_current: row.start_at <= now && now < row.end_at,
    })),
  }
})
