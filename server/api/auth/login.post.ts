import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { verifyPassword } from '../../utils/password'
import { signUserJwt } from '../../utils/jwt'
import { normalizePhoneTo628 } from '../../utils/phone'

type LoginBody = {
  identifier?: string
  phoneNumber?: string
  email?: string
  username?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as LoginBody
  const identifierRaw = body?.identifier || body?.phoneNumber || body?.email || body?.username
  const password = body?.password

  if (!identifierRaw || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'identifier and password are required',
    })
  }

  const env = getCloudflareEnv(event)
  if (!env.JWT_SECRET || env.JWT_SECRET === 'CHANGE_ME') {
    throw createError({
      statusCode: 500,
      statusMessage: 'JWT_SECRET not configured (use wrangler secret put JWT_SECRET)',
    })
  }
  const expiresSeconds = Number(env.JWT_EXPIRES_SECONDS || '604800') || 604800

  const identifier = String(identifierRaw).trim()
  const identifierLower = identifier.toLowerCase()
  let phoneNumber = ''
  try {
    phoneNumber = normalizePhoneTo628(identifier)
  } catch {
    phoneNumber = ''
  }

  const user = await env.DB.prepare(
    `SELECT
        u.id,
        u.phone_number,
        u.password
     FROM users u
     WHERE u.deleted_at IS NULL
       AND (
         (?1 <> '' AND u.phone_number = ?1)
         OR LOWER(u.email) = ?2
         OR LOWER(u.username) = ?2
       )
     LIMIT 1`,
  )
    .bind(phoneNumber, identifierLower)
    .first<{
      id: number
      phone_number: string | null
      password: string | null
    }>()

  if (!user?.id || !user.password) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid login or password' })
  }

  const ok = await verifyPassword(password, user.password)
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid login or password' })
  }

  // Fetch all roles for user from user_roles table
  const userRoles = await env.DB.prepare(
    `SELECT r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ? AND r.deleted_at IS NULL ORDER BY r.id`
  ).bind(user.id).all<{ name: string }>()
  const roleNames = userRoles.results.map(r => r.name)

  const token = await signUserJwt({
    userId: user.id,
    phoneNumber: user.phone_number || '',
    roles: roleNames,
    secret: env.JWT_SECRET,
    expiresSeconds,
  })

  return {
    ok: true,
    token,
    roles: roleNames,
  }
})

