import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  // Fetch all role_ids from user_roles junction table
  const userRoles = await env.DB.prepare(
    `SELECT ur.role_id FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ? AND r.deleted_at IS NULL`
  ).bind(Number(auth.sub)).all<{ role_id: number }>()

  const roleIds = userRoles.results.map(r => r.role_id)
  if (roleIds.length === 0) {
    return { ok: true, permissions: [] }
  }

  const placeholders = roleIds.map(() => '?').join(',')
  const result = await env.DB.prepare(
    `SELECT DISTINCT p.code
     FROM role_permissions rp
     JOIN permissions p ON p.id = rp.permission_id
     WHERE rp.role_id IN (${placeholders})
     ORDER BY p.code`
  ).bind(...roleIds).all<{ code: string }>()

  return {
    ok: true,
    permissions: result.results.map(r => r.code),
  }
})
