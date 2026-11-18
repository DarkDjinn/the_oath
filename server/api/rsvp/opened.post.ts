import { canAccess } from '../../core/auth'
import { getCampaign } from '../../core/campaigns'
import { NotFoundError } from '../../core/errors'
import { getByToken, markOpened } from '../../core/invitations'

/**
 * The guest's browser reports that the invitation is on their screen. Fetching the page alone
 * records nothing, so a link preview or a scanner that never runs the page is not an "opened".
 */
export default apiHandler((event) => {
  const db = useDb()
  const row = getByToken(db, bearerToken(event))
  if (!row) throw new NotFoundError('This invitation link is not valid.')
  const campaign = getCampaign(db, row.campaign_id)
  // An admin checking a link does not count as the guest opening it; nor does a campaign that is not live.
  if (campaign.status === 'live' && !canAccess(sessionOf(event), campaign.id)) markOpened(db, row)
  return { ok: true }
})
