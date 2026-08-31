import { createError, getHeader, type H3Event } from 'h3'
import { getCloudflareEnv } from './cf-env'
import { verifyUserJwt, type JwtUserPayload } from './jwt'

export function getBearerToken(event: H3Event): string | null {
  const h = getHeader(event, 'authorization')
  if (!h) return null
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m?.[1]?.trim() || null
}

export async function requireAuth(event: H3Event): Promise<JwtUserPayload> {
  const token = getBearerToken(event)
  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Missing Bearer token' })
  }

  const env = getCloudflareEnv(event)
  if (!env.JWT_SECRET || env.JWT_SECRET === 'CHANGE_ME') {
    throw createError({
      statusCode: 500,
      statusMessage: 'JWT_SECRET not configured (use wrangler secret put JWT_SECRET)',
    })
  }

  return await verifyUserJwt({ token, secret: env.JWT_SECRET })
}

