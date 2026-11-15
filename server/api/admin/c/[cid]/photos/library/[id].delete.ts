import { forgetLibraryPhoto, isLibraryId, libraryInUse, listLibrary } from '../../../../../../core/photos'

/** Forgets a recent photo. A photo set on the page stays there: the slot has its own copy. */
export default apiHandler((event) => {
  const row = requireCampaign(event)
  const id = getRouterParam(event, 'id')
  if (!isLibraryId(id)) throw createError({ statusCode: 404, message: 'Not found.' })
  forgetLibraryPhoto(row.id, id)
  return { photos: listLibrary(row.id), inUse: libraryInUse(row.id) }
})
