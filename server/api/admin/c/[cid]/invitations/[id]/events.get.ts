import { getById, listEvents } from '../../../../../../core/invitations'

/** The history of one invitation: created, sent, opened, answered, edited. */
export default apiHandler((event) => {
  const campaign = requireCampaign(event)
  const row = getById(useDb(), campaign.id, invitationId(event))
  return listEvents(useDb(), campaign.id, row.id)
})
