import type { UserProfile } from '~/models/profile'

export function fetchUserProfile(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; user: UserProfile }>('/api/user/profile', {
    headers,
  })
}

export function updateUserProfile(
  payload: { fullname: string; phoneNumber: string | null; email: string | null; username: string | null; digitalSignatureData: string | null },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>('/api/user/profile', {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function changeUserPassword(
  payload: { currentPassword: string; newPassword: string },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>('/api/user/change-password', {
    method: 'POST',
    headers,
    body: payload,
  })
}
