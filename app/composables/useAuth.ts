export function useAuth() {
  const token = useState<string | null>('auth_token', () => null)
  const tokenCookie = useCookie<string | null>('token', { sameSite: 'lax' })

  const isLoggedIn = computed(() => !!token.value)

  function loadFromStorage() {
    if (token.value) return
    // Client: localStorage is source of truth
    if (import.meta.client) {
      const t = localStorage.getItem('token')
      if (!t) {
        // ensure cookie/state are cleared too
        logout()
        return
      }
      token.value = t
      tokenCookie.value = t
      return
    }

    // Server: fall back to cookie (no access to localStorage)
    const fromCookie = tokenCookie.value
    token.value = fromCookie || null
  }

  function setToken(t: string) {
    token.value = t
    tokenCookie.value = t
    if (import.meta.client) localStorage.setItem('token', t)
  }

  function logout() {
    token.value = null
    tokenCookie.value = null
    if (import.meta.client) localStorage.removeItem('token')
  }

  function authHeaders(): Record<string, string> {
    if (!token.value) return {}
    return { Authorization: `Bearer ${token.value}` }
  }

  return { token, isLoggedIn, loadFromStorage, setToken, logout, authHeaders }
}

