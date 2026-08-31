import { createError, setHeader } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  const user = await env.DB.prepare(
    `SELECT digital_signature_data
     FROM users
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(Number(auth.sub))
    .first<{ digital_signature_data: string | null }>()

  const objectKey = user?.digital_signature_data || ''
  if (!objectKey) {
    throw createError({ statusCode: 404, statusMessage: 'Signature belum tersedia' })
  }
  if (objectKey.startsWith('data:image/')) {
    throw createError({ statusCode: 410, statusMessage: 'Signature lama masih berupa base64. Upload ulang signature ke R2.' })
  }
  if (!objectKey.startsWith(`digital-signatures/${auth.sub}/`)) {
    throw createError({ statusCode: 403, statusMessage: 'Signature tidak sesuai user' })
  }

  const object = await env.R2.get(objectKey)
  if (!object) {
    throw createError({ statusCode: 404, statusMessage: 'File signature tidak ditemukan di R2' })
  }

  setHeader(event, 'Content-Type', object.httpMetadata?.contentType || 'image/png')
  setHeader(event, 'Cache-Control', 'private, max-age=300')
  return object.body
})
