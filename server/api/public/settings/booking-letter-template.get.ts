import { getCloudflareEnv } from '../../../utils/cf-env'
import { getExternalBookingLetterTemplate } from '../../../utils/settings'

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const template = await getExternalBookingLetterTemplate(env.DB)
  return { ok: true, template }
})
