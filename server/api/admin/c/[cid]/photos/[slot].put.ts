import sharp from 'sharp'
import { isSlot, PHOTO_MAX_BYTES, photoTarget, removePhoto } from '../../../../../core/photos'

/**
 * Upload a photo as the raw request body. The image is decoded and re-encoded,
 * which verifies it really is an image and drops any metadata (location, camera).
 */
export default apiHandler(async (event) => {
  const row = requireCampaign(event)
  const slot = getRouterParam(event, 'slot')
  if (!isSlot(slot)) throw createError({ statusCode: 404, message: 'Not found.' })
  const body = await readRawBody(event, false)
  if (!body?.length) throw createError({ statusCode: 400, message: 'No image received.', data: { code: 'photo_missing' } })
  if (body.length > PHOTO_MAX_BYTES) throw createError({ statusCode: 413, message: 'The photo is larger than 12 MB.', data: { code: 'photo_too_large' } })
  let image: Buffer
  try {
    image = await sharp(body, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
  }
  catch {
    throw createError({ statusCode: 400, message: 'That file is not an image we can read. Use JPEG, PNG, WebP or AVIF.', data: { code: 'photo_invalid' } })
  }
  removePhoto(row.id, slot)
  await sharp(image).toFile(photoTarget(row.id, slot))
  return adminCampaignView(event, row)
})
