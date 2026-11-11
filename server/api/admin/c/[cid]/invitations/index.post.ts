import { createInvitation } from '../../../../../core/invitations'

export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  const body = (await readBody(event)) ?? {}
  setResponseStatus(event, 201)
  return adminView(event, campaign, createInvitation(useDb(), tokenSecret(), campaign.id, body))
})
