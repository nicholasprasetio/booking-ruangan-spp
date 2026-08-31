export function login(payload: { identifier: string; password: string }) {
  return $fetch<{ ok: boolean; token: string }>('/api/auth/login', {
    method: 'POST',
    body: payload,
  })
}

export function register(payload: { fullname: string; phoneNumber: string; password: string }) {
  return $fetch<{ ok: boolean }>('/api/auth/register', {
    method: 'POST',
    body: payload,
  })
}
