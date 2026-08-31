export default defineNuxtRouteMiddleware((to) => {
  if (to.meta.layout) return

  const defaultPaths = ['/', '/external-booking/request', '/auth/login', '/auth/register', '/login', '/register']
  if (defaultPaths.includes(to.path) || to.path.startsWith('/verify-document/')) return

  setPageLayout('authenticated')
})
