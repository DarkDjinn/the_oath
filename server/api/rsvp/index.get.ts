import { NotFoundError } from '../../core/errors'
import { getByToken, toGuest } from '../../core/invitations'

export default apiHandler((event) => {
  const row = getByToken(useDb(), bearerToken(event))
  if (!row) throw new NotFoundError('This invitation link is not valid.')
  return toGuest(row)
})
