import { deleteCampaign } from '../../../../core/campaigns'
import { removeCampaignPhotos } from '../../../../core/photos'

/** Owner only. The request must repeat the campaign's address, so a stray call cannot delete one. */
export default apiHandler(async (event) => {
  requireOwner(event)
  const row = requireCampaign(event)
  const body = (await readBody(event)) ?? {}
  if (body.confirm !== row.slug) throw createError({ statusCode: 400, message: 'Type the campaign address to confirm.', data: { code: 'confirm_required' } })
  deleteCampaign(useDb(), row.id)
  removeCampaignPhotos(row.id)
  return { ok: true }
})
