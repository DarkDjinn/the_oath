import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { libraryFile } from '../../../../../../core/photos'

/** A small preview of a recent photo, for the picker (admin only, never cached by shared caches). */
export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  const file = libraryFile(row.id, getRouterParam(event, 'id') ?? '')
  if (!file) throw createError({ statusCode: 404, message: 'Not found.' })
  const image = await sharp(await readFile(file.path)).resize({ width: 320, height: 320, fit: 'cover' }).webp({ quality: 74 }).toBuffer()
  setResponseHeaders(event, { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400' })
  return image
})
