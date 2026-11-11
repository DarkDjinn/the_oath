import { setRevoked } from '../../../../../../core/invitations'

export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  const body = (await readBody(event)) ?? {}
  return adminView(event, campaign, setRevoked(useDb(), campaign.id, invitationId(event), body.revoked !== false))
})
