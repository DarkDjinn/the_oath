import { setWhatsapp } from '../../../../core/campaigns'

export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  return adminCampaignView(event, setWhatsapp(useDb(), row.id, await readBody(event)))
})
