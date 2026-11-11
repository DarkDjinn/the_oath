import { createCampaign } from '../../../core/campaigns'

export default apiHandler(async (event) => {
  requireOwner(event)
  const body = (await readBody(event)) ?? {}
  setResponseStatus(event, 201)
  return adminCampaignView(event, createCampaign(useDb(), body))
})
