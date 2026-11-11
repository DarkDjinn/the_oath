import { setRevoked } from '../../../../core/invitations'

export default apiHandler(async (event) => {
  const body = (await readBody(event)) ?? {}
  return adminView(event, setRevoked(useDb(), invitationId(event), body.revoked !== false))
})
