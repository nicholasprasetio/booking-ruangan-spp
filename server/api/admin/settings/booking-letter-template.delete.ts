import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { getExternalBookingLetterTemplate } from '../../../utils/settings'

const TEMPLATE_DIR = '/home/jelastic/ROOT/uploads/booking-letter-template'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const previous = await getExternalBookingLetterTemplate(env.DB)

  const at = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')

  const entries = [
    'external_booking_letter_template_object_key',
    'external_booking_letter_template_file_name',
    'external_booking_letter_template_content_type',
    'external_booking_letter_template_file_size',
    'external_booking_letter_template_updated_at',
  ]

  await env.DB.batch(
    entries.map((key) =>
      env.DB
        .prepare(
          `INSERT INTO app_settings (\`key\`, value, updated_at)
           VALUES (?1, '', ?2)
           ON DUPLICATE KEY UPDATE
             value = VALUES(value),
             updated_at = VALUES(updated_at)`,
        )
        .bind(key, at),
    ),
  )

  if (previous.object_key) {
    const filename = path.basename(previous.object_key)
    const filePath = path.join(TEMPLATE_DIR, filename)

    await fs.rm(filePath, { force: true }).catch(() => undefined)
  }

  return {
    ok: true,
    template: await getExternalBookingLetterTemplate(env.DB),
  }
})
