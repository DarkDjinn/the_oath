import { regenerateToken } from '../../../../../../core/invitations'

export default apiHandler((event) => {
  const campaign = requireCampaign(event)
  return adminView(event, campaign, regenerateToken(useDb(), tokenSecret(), campaign.id, invitationId(event)))
})
