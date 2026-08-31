import type { PaginatedResponse } from '~/models/pagination'
import type { AdminUserRow, CurrentUser } from '~/models/user'

export function fetchCurrentUser(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; user: CurrentUser }>('/api/auth/me', { headers })
}

export function fetchAdminUsers(
  params: { page: number; pageSize: number; search?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<AdminUserRow>>('/api/admin/users', {
    headers,
    query: params,
  })
}

export function createAdminUser(
  payload: { fullname: string; phoneNumber?: string | null; email?: string | null; username?: string | null; password: string; roles: string[] },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; user: AdminUserRow }>('/api/admin/users', {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function updateAdminUserRole(userId: number, payload: { roles: string[] }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/users/${userId}/role`, {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function resetAdminUserPassword(userId: number, payload: { password: string }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function deleteAdminUser(userId: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers,
  })
}

