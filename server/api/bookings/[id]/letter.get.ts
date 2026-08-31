import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { hasRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })

  const booking = await env.DB.prepare(
    `SELECT
        user_id,
        request_letter_object_key,
        request_letter_file_name,
        request_letter_content_type
     FROM bookings
     WHERE id = ?1
       AND deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(id)
    .first<{
      user_id: number
      request_letter_object_key: string | null
      request_letter_file_name: string | null
      request_letter_content_type: string | null
    }>()

  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (Number(booking.user_id) !== Number(auth.sub) && !hasRole(auth, 'admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
  if (!booking.request_letter_object_key) {
    throw createError({ statusCode: 404, statusMessage: 'Request letter not found' })
  }

  const LETTER_DIR = '/home/jelastic/ROOT/uploads/external-booking-letters'

  const filename = path.basename(booking.request_letter_object_key)

  const absolutePath = path.join(LETTER_DIR, filename)



  let file

  try {

    file = await fs.readFile(absolutePath)

  } catch {

    throw createError({ statusCode: 404, statusMessage: 'Request letter not found' })

  }



  const fileName = booking.request_letter_file_name || `booking-${id}-letter.pdf`

  return new Response(file, {

    headers: {

      'Content-Type': booking.request_letter_content_type || 'application/pdf',

      'Content-Disposition': `inline; filename="${fileName.replace(/"/g, '')}"`,

      'Cache-Control': 'private, max-age=60',

    },

  })
})
