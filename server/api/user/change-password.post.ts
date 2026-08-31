import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hashPassword, verifyPassword } from '../../utils/password'

type PasswordBody = {
  currentPassword?: string
  newPassword?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as PasswordBody
  const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

  if (!currentPassword || !newPassword) {
    throw createError({ statusCode: 400, statusMessage: 'currentPassword and newPassword are required' })
  }
  if (newPassword.length < 8) {
    throw createError({ statusCode: 400, statusMessage: 'Password min 8 chars' })
  }

  const user = await env.DB.prepare(
    `SELECT id, password FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
  )
    .bind(Number(auth.sub))
    .first<{ id: number; password: string | null }>()

  if (!user?.password) {
    throw createError({ statusCode: 400, statusMessage: 'Password tidak ditemukan' })
  }

  const ok = await verifyPassword(currentPassword, user.password)
  if (!ok) {
    throw createError({ statusCode: 400, statusMessage: 'Password lama tidak sesuai' })
  }

  const hashed = await hashPassword(newPassword)
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  await env.DB.prepare(
    `UPDATE users
     SET password = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(hashed, now, user.id)
    .run()

  return { ok: true }
})
