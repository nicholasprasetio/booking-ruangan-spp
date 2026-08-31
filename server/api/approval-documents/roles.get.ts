import { createError } from 'h3'
import { requireAuth } from '../../../server/utils/auth'
import { getCloudflareEnv } from '../../../server/utils/cf-env'

export default defineEventHandler(async (event) => {
  await requireAuth(event)
  const env = getCloudflareEnv(event)

  try {
    const roles = await env.DB.prepare(
      `SELECT id, name FROM roles WHERE deleted_at IS NULL ORDER BY name ASC`
    ).all()

    return {
      data: roles.results,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch roles',
    })
  }
})
