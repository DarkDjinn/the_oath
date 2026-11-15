import { isLibraryId, isSlot, useLibraryPhoto } from '../../../../../core/photos'

/** Sets a photo slot to one of the campaign's recent photos: `{ "photo": "<id>" }`. */
export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  const slot = getRouterParam(event, 'slot')
  if (!isSlot(slot)) throw createError({ statusCode: 404, message: 'Not found.' })
  const photo = ((await readBody(event)) ?? {}).photo
  if (!isLibraryId(photo)) throw createError({ statusCode: 400, message: 'Choose one of your recent photos.', data: { code: 'photo_invalid' } })
  if (!useLibraryPhoto(row.id, slot, photo)) throw createError({ statusCode: 404, message: 'That photo is no longer in your recent photos.', data: { code: 'photo_gone' } })
  return adminCampaignView(event, row)
})
