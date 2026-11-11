import { createSession, verifyPassword } from '../../core/auth'
import { createRateLimiter } from '../../core/rateLimit'

const perIp = createRateLimiter({ windowMs: 15 * 60_000, max: 5 })
const overall = createRateLimiter({ windowMs: 15 * 60_000, max: 40 })

export default apiHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const limits = [perIp.hit(ip), overall.hit('all')]
  const blocked = limits.find(l => !l.allowed)
  if (blocked) {
    setResponseHeader(event, 'Retry-After', blocked.retryAfter)
    throw createError({ statusCode: 429, message: 'Too many sign-in attempts. Try again in a few minutes.', data: { code: 'rate_limited' } })
  }
  const { password } = (await readBody(event)) ?? {}
  if (!verifyPassword(password, process.env.ADMIN_PASSWORD_HASH)) {
    throw createError({ statusCode: 401, message: 'Wrong password.', data: { code: 'bad_credentials' } })
  }
  perIp.reset(ip)
  const session = createSession(useDb())
  setCookie(event, SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !import.meta.dev && process.env.COOKIE_SECURE !== 'false',
    path: '/',
    maxAge: session.maxAge,
  })
  return { ok: true }
})
