import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { getExternalBookingLetterTemplate } from '../../../../utils/settings'

const TEMPLATE_DIR = '/home/jelastic/ROOT/uploads/booking-letter-template'

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)

  const template = await getExternalBookingLetterTemplate(env.DB)

  if (!template.object_key) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Template surat belum tersedia',
    })
  }

  const filename = path.basename(template.object_key)
  const filePath = path.join(TEMPLATE_DIR, filename)

  try {
    const data = await fs.readFile(filePath)

    return new Response(data, {
      headers: {
        'Content-Type': template.content_type || 'application/pdf',
        'Content-Disposition': `inline; filename="${template.file_name || 'template-surat-peminjaman.pdf'}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch {
    throw createError({
      statusCode: 404,
      statusMessage: 'File template tidak ditemukan',
    })
  }
})
