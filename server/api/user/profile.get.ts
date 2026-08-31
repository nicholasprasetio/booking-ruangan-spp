import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const user = await env.DB.prepare(
    `SELECT id, fullname, username, phone_number, email, digital_signature_data, created_at, updated_at
     FROM users
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(Number(auth.sub))
    .first<{
      id: number
      fullname: string | null
      username: string | null
      phone_number: string | null
      email: string | null
      digital_signature_data: string | null
      created_at: string | null
      updated_at: string | null
    }>()

  return { ok: true, user }
})
