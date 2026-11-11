import { canAccess } from '../../core/auth'
import { contentOf, getCampaign } from '../../core/campaigns'
import { NotFoundError } from '../../core/errors'
import { getByToken, markOpened, toGuest } from '../../core/invitations'

/** A guest's invitation together with the campaign it belongs to. */
export default apiHandler((event) => {
  const db = useDb()
  const row = getByToken(db, bearerToken(event))
  if (!row) throw new NotFoundError('This invitation link is not valid.')
  const campaign = getCampaign(db, row.campaign_id)
  const admin = canAccess(sessionOf(event), campaign.id)
  if (campaign.status === 'draft' && !admin) throw createError({ statusCode: 404, message: 'This invitation is not open yet.', data: { code: 'not_open' } })
  // An admin checking a link does not count as the guest opening it.
  if (campaign.status === 'live' && !admin) markOpened(db, row)
  return { invitation: toGuest(row, contentOf(campaign).rsvp.guestLimit), campaign: publicView(campaign) }
})
