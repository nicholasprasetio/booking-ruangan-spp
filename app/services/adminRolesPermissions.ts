export interface Permission {
  id: number
  code: string
  name: string
  description: string | null
  category: string | null
  default_granted: number
  created_at: string
}

export interface RolePermission extends Permission {
  granted: number
  default_granted: number
}

export interface Role {
  id: number
  name: string
  user_count: number
  created_at: string | null
  updated_at: string | null
}

export function fetchPermissions(headers: Record<string, string>, category?: string) {
  const query: Record<string, string> = {}
  if (category) query.category = category
  return $fetch<{ ok: boolean; data: Permission[] }>('/api/admin/permissions', { headers, query })
}

export function createPermission(data: { code: string; name: string; description?: string; category?: string; default_granted?: boolean }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; id: number }>('/api/admin/permissions', { method: 'POST', headers, body: data })
}

export function updatePermission(id: number, data: { name: string; description?: string; category?: string; default_granted?: boolean }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/permissions/${id}`, { method: 'PUT', headers, body: data })
}

export function deletePermission(id: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/permissions/${id}`, { method: 'DELETE', headers })
}

export function fetchRoles(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; data: Role[] }>('/api/admin/roles', { headers })
}

export function createRole(data: { name: string }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; id: number }>('/api/admin/roles', { method: 'POST', headers, body: data })
}

export function updateRole(id: number, data: { name: string }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/roles/${id}`, { method: 'PUT', headers, body: data })
}

export function deleteRole(id: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/roles/${id}`, { method: 'DELETE', headers })
}

export function fetchRolePermissions(roleId: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; data: RolePermission[] }>(`/api/admin/roles/${roleId}/permissions`, { headers })
}

export function updateRolePermissions(roleId: number, permissionIds: number[], headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/roles/${roleId}/permissions`, { method: 'PUT', headers, body: { permission_ids: permissionIds } })
}
