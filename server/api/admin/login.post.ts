import { createSession, verifyPassword } from '../../core/auth'
import { getCampaignBySlug } from '../../core/campaigns'
import { createRateLimiter } from '../../core/rateLimit'

const perIp = createRateLimiter({ windowMs: 15 * 60_000, max: 5 })
const overall = createRateLimiter({ windowMs: 15 * 60_000, max: 60 })

/**
 * `username` is "admin" for the owner, or a campaign's address (slug) for a couple.
 * Wrong username and wrong password give the same answer.
 */
export default apiHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const blocked = [perIp.hit(ip), overall.hit('all')].find(l => !l.allowed)
  if (blocked) {
    setResponseHeader(event, 'Retry-After', blocked.retryAfter)
    throw createError({ statusCode: 429, message: 'Too many sign-in attempts. Try again in a few minutes.', data: { code: 'rate_limited' } })
  }
  const body = (await readBody(event)) ?? {}
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const isOwner = username === '' || username === 'admin'
  const campaign = isOwner ? null : getCampaignBySlug(useDb(), username)
  const stored = isOwner ? process.env.ADMIN_PASSWORD_HASH : campaign?.password_hash ?? undefined
  // Verify against a dummy hash when the campaign does not exist, so timing does not reveal which addresses are real.
  const ok = verifyPassword(body.password, stored ?? 'scrypt:AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA') && !!stored
  if (!ok || (!isOwner && !campaign)) {
    throw createError({ statusCode: 401, message: 'Wrong name or password.', data: { code: 'bad_credentials' } })
  }
  perIp.reset(ip)
  const session = createSession(useDb(), campaign?.id ?? null)
  setCookie(event, SESSION_COOKIE, session.token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: !import.meta.dev && process.env.COOKIE_SECURE !== 'false',
    path: '/',
    maxAge: session.maxAge,
  })
  return { ok: true, role: isOwner ? 'owner' : 'couple', campaignId: campaign?.id ?? null }
})
