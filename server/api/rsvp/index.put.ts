import { contentOf, getCampaign } from '../../core/campaigns'
import { submitRsvp, toGuest } from '../../core/invitations'

export default apiHandler(async (event) => {
  const body = await readBody(event)
  const row = submitRsvp(useDb(), bearerToken(event), body)
  return toGuest(row, contentOf(getCampaign(useDb(), row.campaign_id)).rsvp.guestLimit)
})
