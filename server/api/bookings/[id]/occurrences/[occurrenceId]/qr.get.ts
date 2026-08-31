import { createError, getRequestURL } from 'h3'
import { getCloudflareEnv } from '../../../../../utils/cf-env'
import { requireAuth } from '../../../../../utils/auth'
import { hasRole } from '../../../../../utils/roles'
import { ensureBookingKeyToken } from '../../../../../utils/booking-v2'
import { userHasPermission } from '../../../../../utils/permissions'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const bookingId = Number(getRouterParam(event, 'id'))
  const occurrenceId = Number(getRouterParam(event, 'occurrenceId'))
  if (!bookingId || !occurrenceId) throw createError({ statusCode: 400, statusMessage: 'Invalid booking/occurrence id' })

  const row = await env.DB.prepare(
    `SELECT b.user_id, bo.status
     FROM booking_occurrences bo
     JOIN bookings b ON b.id = bo.booking_id
     WHERE b.id = ?1
       AND bo.id = ?2
       AND b.deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(bookingId, occurrenceId)
    .first<{ user_id: number; status: string }>()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Occurrence not found' })
  const canAccess = Number(row.user_id) === Number(auth.sub)
    || hasRole(auth, 'admin')
    || await userHasPermission(env.DB, auth.sub, 'menu.security_keys')
  if (!canAccess) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  if (row.status !== 'approved') {
    throw createError({ statusCode: 409, statusMessage: 'QR hanya tersedia untuk sesi yang sudah disetujui' })
  }

  const token = await ensureBookingKeyToken(env.DB, { bookingId, occurrenceId })
  const origin = getRequestURL(event).origin
  const scanUrl = `${origin}/security/scan?token=${encodeURIComponent(token)}`
  const qrImageUrl = `https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(scanUrl)}`

  return {
    ok: true,
    bookingId,
    occurrenceId,
    token,
    scanUrl,
    qrImageUrl,
  }
})
