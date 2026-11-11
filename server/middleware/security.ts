import { PHOTO_MAX_BYTES } from '../core/photos'
import { createRateLimiter } from '../core/rateLimit'

/** Guest-facing lookups: generous for a real guest, useless for guessing 256-bit tokens. */
const guestLimiter = createRateLimiter({ windowMs: 5 * 60_000, max: 90 })
const MAX_BODY_BYTES = 1_000_000

const CSP = [
  'default-src \'self\'',
  'img-src \'self\' data:',
  'style-src \'self\' \'unsafe-inline\'',
  // Nuxt inlines its hydration payload; no third-party origins are allowed.
  'script-src \'self\' \'unsafe-inline\'',
  'connect-src \'self\'',
  'font-src \'self\'',
  // The admin's design preview frames the invitation from the same origin.
  'frame-ancestors \'self\'',
  'base-uri \'self\'',
  'form-action \'self\'',
].join('; ')

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]!
  const method = event.method

  setResponseHeaders(event, {
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    ...(import.meta.dev ? {} : { 'Content-Security-Policy': CSP }),
  })

  const isGuest = /^\/(w\/[^/]+\/)?i\//.test(path) || path.startsWith('/api/rsvp')
  const isAdminApi = path.startsWith('/api/admin/')
  if (isGuest || isAdminApi || path.startsWith('/admin')) {
    setResponseHeaders(event, { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' })
  }

  const bodyLimit = /^\/api\/admin\/c\/\d+\/photos\//.test(path) ? PHOTO_MAX_BYTES : MAX_BODY_BYTES
  if (Number(getRequestHeader(event, 'content-length') || 0) > bodyLimit) {
    throw createError({ statusCode: 413, message: 'Request too large.' })
  }

  if (isGuest) {
    // Internal SSR sub-requests have no socket address and were already counted on the page request.
    const ip = getRequestIP(event, { xForwardedFor: true })
    if (ip) {
      const { allowed, retryAfter } = guestLimiter.hit(ip)
      if (!allowed) {
        setResponseHeader(event, 'Retry-After', retryAfter)
        throw createError({ statusCode: 429, message: 'Too many requests. Please try again in a few minutes.', data: { code: 'rate_limited' } })
      }
    }
  }

  if (isAdminApi) {
    // CSRF: the session cookie is SameSite=Strict, and state-changing requests must also come from this origin.
    if (method !== 'GET' && method !== 'HEAD') {
      const origin = getRequestHeader(event, 'origin')
      const host = getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host')
      if (origin && new URL(origin).host !== host) throw createError({ statusCode: 403, message: 'Cross-origin request refused.' })
    }
    const open = path === '/api/admin/login' || path === '/api/admin/session'
    if (!open && !isAdmin(event)) throw createError({ statusCode: 401, message: 'Sign in required.', data: { code: 'unauthorized' } })
  }
})
