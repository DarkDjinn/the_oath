import { createInvitation } from '../../../core/invitations'

export default apiHandler(async (event) => {
  const body = (await readBody(event)) ?? {}
  setResponseStatus(event, 201)
  return adminView(event, createInvitation(useDb(), tokenSecret(), body))
})
