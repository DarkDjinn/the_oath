import { canAccess } from '../core/auth'
import { getCampaignBySlug } from '../core/campaigns'
import { normaliseDesign } from '#shared/themes'

/**
 * The public face of one campaign, found by `?slug=` or by the subdomain the request came in on.
 * Drafts are visible only to an admin of that campaign, who may also preview an unsaved design (`?draft=`).
 */
export default apiHandler((event) => {
  const query = getQuery(event)
  const row = typeof query.slug === 'string' && query.slug ? getCampaignBySlug(useDb(), query.slug) : campaignFromHost(event)
  if (!row) throw createError({ statusCode: 404, message: 'No invitation at this address.', data: { code: 'not_found' } })
  const admin = canAccess(sessionOf(event), row.id)
  if (row.status === 'draft' && !admin) throw createError({ statusCode: 404, message: 'This invitation is not open yet.', data: { code: 'not_open' } })

  const campaign = publicView(row)
  if (admin && typeof query.draft === 'string') {
    try { campaign.design = { ...normaliseDesign(JSON.parse(query.draft), row.slug, campaign.design), customCss: campaign.design.customCss } }
    catch { /* ignore a malformed preview */ }
  }
  return campaign
})
