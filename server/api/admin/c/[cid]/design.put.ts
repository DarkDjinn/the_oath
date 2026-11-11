import { setDesign } from '../../../../core/campaigns'

/** Couples choose a theme and its options. Custom CSS is applied only for the owner. */
export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  return adminCampaignView(event, setDesign(useDb(), row.id, await readBody(event), sessionOf(event)?.role === 'owner'))
})
