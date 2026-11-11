import { deleteInvitation } from '../../../../../../core/invitations'

export default apiHandler((event) => {
  deleteInvitation(useDb(), requireCampaign(event).id, invitationId(event))
  return { ok: true }
})
