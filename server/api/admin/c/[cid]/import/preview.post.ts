import { buildPreview } from '../../../../../core/importer'
import { listInvitations } from '../../../../../core/invitations'

export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  const { csv } = (await readBody(event)) ?? {}
  if (typeof csv !== 'string') throw createError({ statusCode: 400, message: 'No CSV content received.', data: { code: 'csv_required' } })
  return buildPreview(csv, listInvitations(useDb(), campaign.id).map(r => r.guest_name))
})
