import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)

  const roles = await env.DB.prepare(
    `SELECT r.id, r.name, r.created_at, r.updated_at,
       (SELECT COUNT(*) FROM user_roles ur JOIN users u ON u.id = ur.user_id WHERE ur.role_id = r.id AND u.deleted_at IS NULL) AS user_count
     FROM roles r
     WHERE r.deleted_at IS NULL
     ORDER BY r.id ASC`
  ).all()

  return {
    ok: true,
    data: roles.results,
  }
})
