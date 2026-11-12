import { canAccess } from '../core/auth'
import { getCampaignBySlug } from '../core/campaigns'

/**
 * The public face of one campaign, found by `?slug=` or by the subdomain the request came in on.
 * Drafts are visible only to an admin of that campaign, whose design studio shows unsaved changes inside this page (`?draft=1`, see PublicPage.vue).
 */
export default apiHandler((event) => {
  const query = getQuery(event)
  const row = typeof query.slug === 'string' && query.slug ? getCampaignBySlug(useDb(), query.slug) : campaignFromHost(event)
  if (!row) throw createError({ statusCode: 404, message: 'No invitation at this address.', data: { code: 'not_found' } })
  const admin = canAccess(sessionOf(event), row.id)
  if (row.status === 'draft' && !admin) throw createError({ statusCode: 404, message: 'This invitation is not open yet.', data: { code: 'not_open' } })

  return publicView(row)
})
