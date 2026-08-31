import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { getExternalBookingLetterTemplate } from '../../../utils/settings'

const MAX_PDF_BYTES = 6 * 1024 * 1024
const TEMPLATE_DIR = '/home/jelastic/ROOT/uploads/booking-letter-template'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)

  const formData = await readMultipartFormData(event)
  const file = formData?.find((item) => item.name === 'template' && item.filename)

  if (!file) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File template wajib diupload',
    })
  }

  const contentType = file.type || 'application/pdf'

  if (contentType !== 'application/pdf') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Template surat harus berupa PDF',
    })
  }

  if (!file.data?.byteLength || file.data.byteLength > MAX_PDF_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Ukuran template tidak valid atau lebih dari 6 MB',
    })
  }

  await fs.mkdir(TEMPLATE_DIR, { recursive: true })

  const previous = await getExternalBookingLetterTemplate(env.DB)

  const filename = `${crypto.randomUUID()}.pdf`
  const relativePath = `booking-letter-template/${filename}`
  const absolutePath = path.join(TEMPLATE_DIR, filename)

  await fs.writeFile(absolutePath, file.data)

  try {
    const at = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
    const fileName = file.filename || 'template-surat-peminjaman.pdf'

    const entries = [
      ['external_booking_letter_template_object_key', relativePath],
      ['external_booking_letter_template_file_name', fileName],
      ['external_booking_letter_template_content_type', contentType],
      ['external_booking_letter_template_file_size', String(file.data.byteLength)],
      ['external_booking_letter_template_updated_at', at],
    ]

    await env.DB.batch(
      entries.map(([key, value]) =>
        env.DB
          .prepare(
            `INSERT INTO app_settings (\`key\`, value, updated_at)
             VALUES (?1, ?2, ?3)
             ON DUPLICATE KEY UPDATE
               value = VALUES(value),
               updated_at = VALUES(updated_at)`,
          )
          .bind(key, value, at),
      ),
    )

    // Hapus file template lama setelah database berhasil diperbarui.
    if (previous.object_key) {
      const oldFilename = path.basename(previous.object_key)
      const oldPath = path.join(TEMPLATE_DIR, oldFilename)

      if (oldPath !== absolutePath) {
        await fs.rm(oldPath, { force: true }).catch(() => undefined)
      }
    }

    return {
      ok: true,
      template: await getExternalBookingLetterTemplate(env.DB),
    }
  } catch (error) {
    // Rollback file baru kalau database gagal.
    await fs.rm(absolutePath, { force: true }).catch(() => undefined)
    throw error
  }
})
