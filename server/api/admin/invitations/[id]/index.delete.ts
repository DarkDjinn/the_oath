import { deleteInvitation } from '../../../../core/invitations'

export default apiHandler((event) => {
  deleteInvitation(useDb(), invitationId(event))
  return { ok: true }
})
