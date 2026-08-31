import { createError, getQuery } from 'h3'
import { requireAuth } from '../../../server/utils/auth'
import { getCloudflareEnv } from '../../../server/utils/cf-env'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const query = getQuery(event)

  try {
    // Get all active users, including current user. Some documents need to be
    // signed by the creator as an approver.
    // Group_concat to get all roles as comma-separated string
    const users = await env.DB.prepare(
      `SELECT u.id, u.fullname, u.email, u.phone_number,
         GROUP_CONCAT(r.name, ', ') as role
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       LEFT JOIN roles r ON r.id = ur.role_id AND r.deleted_at IS NULL
       WHERE u.deleted_at IS NULL
       GROUP BY u.id
       ORDER BY u.fullname ASC`
    ).all()

    return {
      data: users.results,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch users',
    })
  }
})
