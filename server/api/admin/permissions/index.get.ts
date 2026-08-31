import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)
  const category = typeof q.category === 'string' ? q.category.trim() : ''

  let sql = `SELECT id, code, name, description, category, default_granted, created_at FROM permissions`
  const binds: unknown[] = []

  if (category) {
    sql += ` WHERE category = ?`
    binds.push(category)
  }

  sql += ` ORDER BY category, code`

  const result = await env.DB.prepare(sql).bind(...binds).all()

  return {
    ok: true,
    data: result.results,
  }
})
