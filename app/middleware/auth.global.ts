export default defineNuxtRouteMiddleware((to) => {
  // Public pages (can be accessed without login)
  const publicPaths = new Set<string>(['/auth/login', '/auth/register', '/login', '/register', '/', '/external-booking/request'])
  const authPages = new Set<string>(['/auth/login', '/auth/register', '/login', '/register'])

  const tokenCookie = useCookie<string | null>('token')

  // If localStorage token is missing, treat as logged out (client only)
  if (import.meta.client) {
    const lsToken = localStorage.getItem('token')
    if (!lsToken) {
      tokenCookie.value = null
    } else if (tokenCookie.value !== lsToken) {
      // keep cookie in sync with localStorage
      tokenCookie.value = lsToken
    }
  }

  const token = tokenCookie.value

  // If already logged in, prevent going back to login/register
  if (authPages.has(to.path)) {
    if (token) {
      const redirect = (to.query.redirect as string) || '/user/book-room'
      return navigateTo(redirect)
    }
    return
  }

  // Allow access to public paths
  if (publicPaths.has(to.path) || to.path.startsWith('/verify-document/')) {
    return
  }

  // Everything else requires login
  if (!token) {
    return navigateTo({
      path: '/auth/login',
      query: { redirect: to.fullPath },
    })
  }
})

