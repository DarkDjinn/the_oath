/** Sends signed-out visitors to the sign-in page. The API enforces access on its own; this is only navigation. */
export default defineNuxtRouteMiddleware(async () => {
  const { authenticated } = await useRequestFetch()<{ authenticated: boolean }>('/api/admin/session')
  if (!authenticated) return navigateTo('/admin/login')
})
