import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { hashPassword } from '../../utils/password'
import { normalizePhoneTo628 } from '../../utils/phone'

type RegisterBody = {
  fullname?: string
  phoneNumber?: string
  password?: string
}

export default defineEventHandler(async (event) => {
  throw createError({ statusCode: 403, statusMessage: 'Public registration is disabled. Please contact an admin.' })

  const body = (await readBody(event)) as RegisterBody
  const fullname = body?.fullname
  const phoneNumberRaw = body?.phoneNumber
  const password = body?.password

  if (!fullname || !phoneNumberRaw || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: 'fullname, phoneNumber and password are required',
    })
  }
  if (password.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password min 8 chars' })
  }

  const phoneNumber = normalizePhoneTo628(phoneNumberRaw)

  const env = getCloudflareEnv(event)
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')

  try {
    const defaultRole = await env.DB.prepare(
      `SELECT id FROM roles WHERE name = 'user' AND deleted_at IS NULL LIMIT 1`,
    ).first<{ id: number }>()

    if (!defaultRole?.id) {
      throw createError({
        statusCode: 500,
        statusMessage:
          "Default role 'user' not found. Run D1 migrations (0003_users-role.sql).",
      })
    }

    const res = await env.DB.prepare(
      `INSERT INTO users (fullname, phone_number, password, is_verified, created_at, updated_at)
       VALUES (?1, ?2, ?3, 0, ?4, ?4)`,
    )
      .bind(fullname, phoneNumber, passwordHash, now)
      .run()

    const newUserId = res.meta.last_row_id

    // Insert into user_roles junction table
    await env.DB.prepare(
      `INSERT INTO user_roles (user_id, role_id, created_at) VALUES (?, ?, ?)`
    ).bind(newUserId, defaultRole.id, now).run()

    return {
      ok: true,
      userId: newUserId,
      fullname,
      phoneNumber,
      roles: ['user'],
    }
  } catch (err: any) {
    // D1 unique constraint errors typically contain "UNIQUE constraint failed"
    const msg = String(err?.message || err)
    if (msg.includes('UNIQUE constraint failed')) {
      throw createError({ statusCode: 409, statusMessage: 'Phone number already registered' })
    }
    throw createError({ statusCode: 500, statusMessage: 'Failed to register' })
  }
})

