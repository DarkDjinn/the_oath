import { computeStats, listInvitations } from '../../../../../core/invitations'

export default apiHandler((event) => {
  const campaign = requireCampaign(event)
  const rows = listInvitations(useDb(), campaign.id)
  return { invitations: rows.map(row => adminView(event, campaign, row)), stats: computeStats(rows) }
})
