import { getCloudflareEnv } from '../../utils/cf-env'
import { getBookingMinLeadDays } from '../../utils/settings'

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  return {
    ok: true,
    settings: {
      booking_min_lead_days: await getBookingMinLeadDays(env.DB),
    },
  }
})
