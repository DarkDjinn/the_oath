import { deleteSession } from '../../core/auth'

export default apiHandler((event) => {
  deleteSession(useDb(), getCookie(event, SESSION_COOKIE))
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
  return { ok: true }
})
