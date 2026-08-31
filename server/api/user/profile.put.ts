import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { normalizePhoneTo628 } from '../../utils/phone'

type ProfileBody = {
  fullname?: string
  phoneNumber?: string
  email?: string | null
  username?: string | null
  digitalSignatureData?: string | null
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as ProfileBody
  const fullname = typeof body?.fullname === 'string' ? body.fullname.trim() : ''
  const phoneNumberRaw = typeof body?.phoneNumber === 'string' ? body.phoneNumber.trim() : ''
  const emailRaw = typeof body?.email === 'string' ? body.email.trim() : ''
  const email = emailRaw ? emailRaw.toLowerCase() : null
  const usernameRaw = typeof body?.username === 'string' ? body.username.trim() : ''
  const username = usernameRaw ? usernameRaw.toLowerCase() : null
  const digitalSignatureDataRaw = typeof body?.digitalSignatureData === 'string' ? body.digitalSignatureData.trim() : ''
  const digitalSignatureData = digitalSignatureDataRaw || null

  if (!fullname) {
    throw createError({ statusCode: 400, statusMessage: 'fullname is required' })
  }
  if (!phoneNumberRaw && !email && !username) {
    throw createError({ statusCode: 400, statusMessage: 'Isi minimal salah satu: email, nomor telepon, atau username' })
  }
  if (username && !/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw createError({ statusCode: 400, statusMessage: 'Username harus 3-32 karakter dan hanya boleh huruf, angka, titik, underscore, atau strip' })
  }

  const phoneNumber = phoneNumberRaw ? normalizePhoneTo628(phoneNumberRaw) : null
  const userId = Number(auth.sub)

  if (phoneNumber) {
    const phoneExists = await env.DB.prepare(
      `SELECT id FROM users WHERE phone_number = ? AND deleted_at IS NULL AND id != ? LIMIT 1`,
    )
      .bind(phoneNumber, userId)
      .first()

    if (phoneExists) {
      throw createError({ statusCode: 409, statusMessage: 'Nomor telepon sudah digunakan' })
    }
  }

  if (email) {
    const emailExists = await env.DB.prepare(
      `SELECT id FROM users WHERE email = ? AND deleted_at IS NULL AND id != ? LIMIT 1`,
    )
      .bind(email, userId)
      .first()
    if (emailExists) {
      throw createError({ statusCode: 409, statusMessage: 'Email sudah digunakan' })
    }
  }

  if (username) {
    const usernameExists = await env.DB.prepare(
      `SELECT id FROM users WHERE username = ? AND deleted_at IS NULL AND id != ? LIMIT 1`,
    )
      .bind(username, userId)
      .first()
    if (usernameExists) {
      throw createError({ statusCode: 409, statusMessage: 'Username sudah digunakan' })
    }
  }

  // Digital signature disimpan sebagai path/string.

  // Tidak bergantung pada Cloudflare R2.



  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  await env.DB.prepare(
    `UPDATE users
     SET fullname = ?, phone_number = ?, email = ?, username = ?, digital_signature_data = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(fullname, phoneNumber, email, username, digitalSignatureData, now, userId)
    .run()

  return { ok: true }
})
