import { setSlug, setStatus } from '../../../../core/campaigns'

/** Owner only: change a campaign's status or address. */
export default apiHandler(async (event) => {
  requireOwner(event)
  let row = requireCampaign(event)
  const body = (await readBody(event)) ?? {}
  if (body.slug !== undefined) row = setSlug(useDb(), row.id, body.slug)
  if (body.status !== undefined) row = setStatus(useDb(), row.id, body.status)
  return adminCampaignView(event, row)
})
