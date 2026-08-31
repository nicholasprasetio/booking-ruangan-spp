import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { hashPassword } from '../../../utils/password'
import { normalizePhoneTo628 } from '../../../utils/phone'

type CreateAdminUserBody = {
  fullname?: string
  phoneNumber?: string
  email?: string | null
  username?: string | null
  password?: string
  roles?: string[]
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const body = await readBody<CreateAdminUserBody>(event)
  const fullname = typeof body?.fullname === 'string' ? body.fullname.trim() : ''
  const phoneNumberRaw = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
  const email = typeof body?.email === 'string' && body.email.trim() ? body.email.trim().toLowerCase() : null
  const username = typeof body?.username === 'string' && body.username.trim() ? body.username.trim().toLowerCase() : null
  const password = typeof body?.password === 'string' ? body.password : ''
  const roleNames = Array.isArray(body?.roles)
    ? body.roles.map((r) => String(r).trim().toLowerCase()).filter(Boolean)
    : ['user']

  if (!fullname || !password) {
    throw createError({ statusCode: 400, statusMessage: 'fullname and password are required' })
  }
  if (!phoneNumberRaw && !email && !username) {
    throw createError({ statusCode: 400, statusMessage: 'Isi minimal salah satu: email, nomor telepon, atau username' })
  }
  if (username && !/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw createError({ statusCode: 400, statusMessage: 'Username harus 3-32 karakter dan hanya boleh huruf, angka, titik, underscore, atau strip' })
  }
  if (password.length < 6) {
    throw createError({ statusCode: 400, statusMessage: 'Password minimal 6 karakter' })
  }
  if (!roleNames.length) {
    throw createError({ statusCode: 400, statusMessage: 'Minimal satu role wajib diisi' })
  }

  const env = getCloudflareEnv(event)
  const roles: Array<{ id: number; name: string }> = []
  for (const name of Array.from(new Set(roleNames))) {
    const role = await env.DB.prepare(
      `SELECT id, name
       FROM roles
       WHERE LOWER(name) = ?1
         AND deleted_at IS NULL
       LIMIT 1`,
    )
      .bind(name)
      .first<{ id: number; name: string }>()

    if (!role) {
      throw createError({ statusCode: 400, statusMessage: `Role "${name}" tidak valid` })
    }
    roles.push(role)
  }

  const phoneNumber = phoneNumberRaw ? normalizePhoneTo628(phoneNumberRaw) : null
  const passwordHash = await hashPassword(password)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')


  try {
    const res = await env.DB.prepare(
      `INSERT INTO users (fullname, phone_number, email, username, password, is_verified, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6)`,
    )
      .bind(fullname, phoneNumber, email, username, passwordHash, now)
      .run()

    const userId = Number(res.meta.insertId)
    const stmts = roles.map((role) =>
      env.DB.prepare(
        `INSERT INTO user_roles (user_id, role_id, created_at)
         VALUES (?1, ?2, ?3)`,
      ).bind(userId, role.id, now),
    )
    await env.DB.batch(stmts)

    return {
      ok: true,
      user: {
        id: userId,
        fullname,
        username,
        phone_number: phoneNumber,
        email,
        role_ids: roles.map((r) => r.id),
        role_names: roles.map((r) => r.name),
        role_id: roles[0]!.id,
        role_name: roles[0]!.name,
        created_at: now,
      },
    }
  } catch (err: any) {
    const msg = String(err?.message || err)
    if (msg.includes('UNIQUE constraint failed: users.phone_number')) {
      throw createError({ statusCode: 409, statusMessage: 'Phone number already registered' })
    }
    if (msg.includes('UNIQUE constraint failed: users.email')) {
      throw createError({ statusCode: 409, statusMessage: 'Email already registered' })
    }
    if (msg.includes('UNIQUE constraint failed: users.username')) {
      throw createError({ statusCode: 409, statusMessage: 'Username already registered' })
    }
    console.error('[CREATE USER ERROR]', err)
    throw createError({ statusCode: 500, statusMessage: msg })
  }
})
