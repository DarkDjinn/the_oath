import { listCampaigns } from '../../../core/campaigns'
import { computeStats, listInvitations } from '../../../core/invitations'

/** The owner sees every campaign; a couple sees only their own. */
export default apiHandler((event) => {
  const session = sessionOf(event)!
  const rows = listCampaigns(useDb()).filter(r => session.role === 'owner' || r.id === session.campaignId)
  return rows.map(row => ({ ...adminCampaignView(event, row), stats: computeStats(listInvitations(useDb(), row.id)) }))
})
