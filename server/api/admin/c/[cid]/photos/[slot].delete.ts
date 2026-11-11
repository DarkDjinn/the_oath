import { isSlot, removePhoto } from '../../../../../core/photos'

export default apiHandler((event) => {
  const row = requireCampaign(event)
  const slot = getRouterParam(event, 'slot')
  if (!isSlot(slot)) throw createError({ statusCode: 404, message: 'Not found.' })
  removePhoto(row.id, slot)
  return adminCampaignView(event, row)
})
