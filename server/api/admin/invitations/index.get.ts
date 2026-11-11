import { computeStats, listInvitations } from '../../../core/invitations'

export default apiHandler((event) => {
  const rows = listInvitations(useDb())
  return { invitations: rows.map(row => adminView(event, row)), stats: computeStats(rows) }
})
