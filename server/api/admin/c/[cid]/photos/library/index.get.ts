import { libraryInUse, listLibrary } from '../../../../../../core/photos'

/** The campaign's recent photos, most recently used first (admin only). */
export default apiHandler((event) => {
  const row = requireCampaign(event)
  return { photos: listLibrary(row.id), inUse: libraryInUse(row.id) }
})
