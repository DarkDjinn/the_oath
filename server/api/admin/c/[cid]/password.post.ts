import { randomBytes } from 'node:crypto'
import { setPassword } from '../../../../core/campaigns'

/** Owner only: issue a new password for the couple. It is returned once and stored only as a hash. */
export default apiHandler((event) => {
  requireOwner(event)
  const row = requireCampaign(event)
  const password = randomBytes(12).toString('base64url')
  setPassword(useDb(), row.id, password)
  return { username: row.slug, password }
})
