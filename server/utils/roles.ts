import { createError, type H3Event } from 'h3'
import type { JwtUserPayload } from './jwt'

export function requireRole(
  _event: H3Event,
  auth: JwtUserPayload,
  allowed: string[],
): void {
  const roles = auth.roles ?? (auth.role ? [auth.role] : [])
  const hasRole = roles.some(r => allowed.includes(r))
  if (!hasRole) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }
}

/** Helper to check if user has a specific role */
export function hasRole(auth: JwtUserPayload, role: string): boolean {
  const roles = auth.roles ?? (auth.role ? [auth.role] : [])
  return roles.includes(role)
}

