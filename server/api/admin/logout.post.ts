import { deleteSession } from '../../core/auth'

export default apiHandler((event) => {
  deleteSession(useDb(), getCookie(event, SESSION_COOKIE))
  // Clear both forms: the shared-domain cookie and a host-only one from before subdomain sharing.
  deleteCookie(event, SESSION_COOKIE, { path: '/', domain: cookieDomain() })
  if (cookieDomain()) appendResponseHeader(event, 'set-cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/`)
  return { ok: true }
})
