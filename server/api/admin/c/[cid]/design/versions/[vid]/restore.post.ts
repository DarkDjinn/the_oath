import { restoreDesignVersion } from '../../../../../../../core/campaigns'

/** Bring an earlier design back; the one it replaces joins the history. */
export default apiHandler((event) => {
  const row = requireCampaign(event)
  return adminCampaignView(event, restoreDesignVersion(useDb(), row.id, getRouterParam(event, 'vid')))
})
