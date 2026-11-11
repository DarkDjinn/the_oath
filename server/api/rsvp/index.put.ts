import { submitRsvp, toGuest } from '../../core/invitations'

export default apiHandler(async (event) => {
  const body = await readBody(event)
  return toGuest(submitRsvp(useDb(), bearerToken(event), body))
})
