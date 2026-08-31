import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { nowIso } from '../../../utils/booking-v2'
import { getExternalBookingLetterTemplate } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const body = await readBody<{ booking_min_lead_days?: number }>(event)
  const raw = Number(body?.booking_min_lead_days ?? 0)
  if (!Number.isFinite(raw) || raw < 0 || raw > 365 || !Number.isInteger(raw)) {
    throw createError({ statusCode: 400, statusMessage: 'Minimal booking harus berupa angka 0-365 hari' })
  }

  const env = getCloudflareEnv(event)
  await env.DB.prepare(

    `INSERT INTO app_settings (\`key\`, value, updated_at)

     VALUES (?, ?, ?)

     ON DUPLICATE KEY UPDATE

       value = VALUES(value),

       updated_at = VALUES(updated_at)`,

  )

    .bind('booking_min_lead_days', String(raw), nowIso())

    .run()



  return {
    ok: true,
    settings: {
      booking_min_lead_days: raw,
      external_booking_letter_template: await getExternalBookingLetterTemplate(env.DB),
    },
  }
})
