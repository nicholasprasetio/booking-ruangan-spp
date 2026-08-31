import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const user = await env.DB.prepare(
    `SELECT
        u.id,
        u.fullname,
        u.username,
        u.phone_number,
        u.email,
        u.digital_signature_data,
        u.is_verified,
        u.created_at,
        u.updated_at
     FROM users u
     WHERE u.id = ?1 AND u.deleted_at IS NULL
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
      is_verified: number | null
      created_at: string | null
      updated_at: string | null
    }>()

  // Fetch all roles from user_roles
  const userRoles = await env.DB.prepare(
    `SELECT r.id as role_id, r.name as role_name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.deleted_at IS NULL
     ORDER BY r.id`
  ).bind(Number(auth.sub)).all<{ role_id: number; role_name: string }>()

  const roles = userRoles.results || []

  return {
    ok: true,
    user: user ? {
      ...user,
      role_ids: roles.map(r => r.role_id),
      role_names: roles.map(r => r.role_name),
      // Keep backwards compat
      role_id: roles[0]?.role_id ?? null,
      role_name: roles[0]?.role_name ?? null,
    } : null,
  }
})

