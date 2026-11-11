import { getCampaignBySlug } from '../core/campaigns'

/**
 * Caddy's on-demand TLS asks this before obtaining a certificate:
 * 200 for the platform's own host and for existing, non-archived campaign subdomains.
 */
export default defineEventHandler((event) => {
  const domain = String(getQuery(event).domain ?? '').toLowerCase()
  const base = baseDomain()
  if (!base || !domain) throw createError({ statusCode: 404, message: 'Unknown host.' })
  if (domain === base) return 'ok'
  if (!domain.endsWith(`.${base}`)) throw createError({ statusCode: 404, message: 'Unknown host.' })
  const row = getCampaignBySlug(useDb(), domain.slice(0, -base.length - 1))
  if (!row || row.status === 'archived') throw createError({ statusCode: 404, message: 'Unknown host.' })
  return 'ok'
})
