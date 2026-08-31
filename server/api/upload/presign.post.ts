import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { requireRole } from '../../utils/roles'
import { generateR2PresignedPutUrl } from '../../utils/r2-presign'

const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
])

function extensionForType(type: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
  }
  return map[type] ?? 'bin'
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const env = getCloudflareEnv(event)

  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
    throw createError({
      statusCode: 500,
      statusMessage: 'R2 S3 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME as Cloudflare secrets.',
    })
  }

  const body = await readBody<{ contentType: string; prefix?: string }>(event)
  const contentType = body?.contentType?.trim()

  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid or unsupported content type. Allowed: image/jpeg, image/png, image/webp, image/gif, application/pdf' })
  }

  const requestedPrefix = /^[a-z0-9/_-]{0,64}$/.test(body?.prefix ?? '') ? (body.prefix ?? 'uploads') : 'uploads'
  const isBookingLetter = requestedPrefix === 'booking-letters'
  const isDigitalSignature = requestedPrefix === 'digital-signatures'
  if (!isBookingLetter && !isDigitalSignature) {
    requireRole(event, auth, ['admin'])
  }
  if (isBookingLetter && contentType !== 'application/pdf') {
    throw createError({ statusCode: 400, statusMessage: 'Surat pengajuan harus berupa PDF' })
  }
  if (isDigitalSignature && !['image/png', 'image/jpeg'].includes(contentType)) {
    throw createError({ statusCode: 400, statusMessage: 'Signature harus berupa PNG/JPG' })
  }

  const prefix = isBookingLetter
    ? `booking-letters/${auth.sub}`
    : isDigitalSignature
      ? `digital-signatures/${auth.sub}`
      : requestedPrefix
  const ext = extensionForType(contentType)
  const objectKey = `${prefix}/${crypto.randomUUID()}.${ext}`
  const expiresSeconds = 300 // 5 minutes

  const presignedUrl = await generateR2PresignedPutUrl(
    {
      accountId: env.R2_ACCOUNT_ID,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      bucketName: env.R2_BUCKET_NAME,
    },
    objectKey,
    contentType,
    expiresSeconds,
  )

  return {
    presignedUrl,
    objectKey,
    expiresAt: new Date(Date.now() + expiresSeconds * 1000).toISOString(),
  }
})
