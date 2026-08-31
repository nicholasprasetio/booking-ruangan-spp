import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { getBookingMinLeadDays, getExternalBookingLetterTemplate } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const bookingMinLeadDays = await getBookingMinLeadDays(env.DB)
  const externalBookingLetterTemplate = await getExternalBookingLetterTemplate(env.DB)

  return {
    ok: true,
    settings: {
      booking_min_lead_days: bookingMinLeadDays,
      external_booking_letter_template: externalBookingLetterTemplate,
    },
  }
})
