import { updateInvitation } from '../../../../core/invitations'

export default apiHandler(async (event) => {
  const body = (await readBody(event)) ?? {}
  return adminView(event, updateInvitation(useDb(), invitationId(event), body))
})
