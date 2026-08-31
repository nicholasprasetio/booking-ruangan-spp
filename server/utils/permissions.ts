import { createError, type H3Event } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import type { JwtUserPayload } from './jwt'

export async function userHasPermission(db: D1Database, userId: number | string, permissionCode: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT p.id
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE ur.user_id = ?1
         AND p.code = ?2
       LIMIT 1`,
    )
    .bind(Number(userId), permissionCode)
    .first<{ id: number }>()

  return Boolean(row)
}

export async function requirePermission(
  _event: H3Event,
  db: D1Database,
  auth: JwtUserPayload,
  permissionCode: string,
): Promise<void> {
  const ok = await userHasPermission(db, auth.sub, permissionCode)
  if (!ok) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}
