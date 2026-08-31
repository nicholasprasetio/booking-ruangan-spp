import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const LETTER_DIR = '/home/jelastic/ROOT/uploads/external-booking-letters'
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid request id' })

  const request = await env.DB
    .prepare(
      `SELECT request_letter_object_key, request_letter_file_name, request_letter_content_type
       FROM external_booking_requests
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<{
      request_letter_object_key: string | null
      request_letter_file_name: string | null
      request_letter_content_type: string | null
    }>()

  if (!request) throw createError({ statusCode: 404, statusMessage: 'Pengajuan external tidak ditemukan' })
  if (!request.request_letter_object_key) {

    throw createError({ statusCode: 404, statusMessage: 'Surat pengajuan tidak tersedia' })

  }



  const filename = path.basename(request.request_letter_object_key)

  const absolutePath = path.join(LETTER_DIR, filename)



  let file

  try {

    file = await fs.readFile(absolutePath)

  } catch {

    throw createError({ statusCode: 404, statusMessage: 'Surat pengajuan tidak ditemukan' })

  }



  return new Response(file, {

    headers: {

      'Content-Type': request.request_letter_content_type || 'application/pdf',

      'Content-Disposition': `inline; filename="${request.request_letter_file_name || `external-request-${id}.pdf`}"`,

      'Cache-Control': 'private, max-age=60',

    },

  })
})
