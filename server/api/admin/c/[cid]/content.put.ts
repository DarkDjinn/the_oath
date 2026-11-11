import { setContent } from '../../../../core/campaigns'

export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  return adminCampaignView(event, setContent(useDb(), row.id, await readBody(event)))
})
