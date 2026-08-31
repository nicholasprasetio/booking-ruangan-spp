export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const globalScope = globalThis as typeof globalThis & {
    __authExpiredFetchPatched__?: boolean
  }

  if (globalScope.__authExpiredFetchPatched__) return
  globalScope.__authExpiredFetchPatched__ = true

  const auth = useAuth()
  const router = useRouter()

  let handlingExpiredToken = false

  const wrappedFetch = $fetch.create({
    onResponseError({ request, response }) {
      if (handlingExpiredToken) return

      const requestUrl
        = typeof request === 'string'
          ? request
          : request instanceof Request
            ? request.url
            : String((request as { url?: string })?.url || request)
      const isApiRequest = requestUrl.startsWith('/api/') || requestUrl.includes('/api/')
      const payload = (response?._data || {}) as { message?: string; statusMessage?: string }
      const message = String(payload.statusMessage || payload.message || '')
      const isTokenExpired = response?.status === 401 && /token expired/i.test(message)

      if (!isApiRequest || !isTokenExpired) return

      handlingExpiredToken = true
      auth.logout()

      const currentRoute = router.currentRoute.value
      const authPages = new Set(['/auth/login', '/auth/register', '/login', '/register'])
      const target = authPages.has(currentRoute.path)
        ? { path: '/auth/login' }
        : { path: '/auth/login', query: { redirect: currentRoute.fullPath } }

      void router.replace(target).finally(() => {
        handlingExpiredToken = false
      })
    },
  })

  globalThis.$fetch = wrappedFetch
})
