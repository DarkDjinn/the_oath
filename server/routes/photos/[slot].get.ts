import sharp from 'sharp'
import { PHOTO_SLOTS, PHOTO_WIDTHS, photoFile } from '../../core/photos'

/** Resized WebP variants, kept in memory: at most 2 photos x 4 widths. */
const cache = new Map<string, Buffer>()

export default defineEventHandler(async (event) => {
  const slot = getRouterParam(event, 'slot') ?? ''
  const width = Number(getQuery(event).w) || 1200
  if (!(PHOTO_SLOTS as readonly string[]).includes(slot) || !PHOTO_WIDTHS.includes(width)) {
    throw createError({ statusCode: 404, message: 'Not found.' })
  }
  const file = photoFile(slot)
  if (!file) throw createError({ statusCode: 404, message: 'Not found.' })

  const key = `${slot}:${width}:${file.version}`
  let image = cache.get(key)
  if (!image) {
    image = await sharp(file.path).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
    for (const k of cache.keys()) if (k.startsWith(`${slot}:${width}:`)) cache.delete(k)
    cache.set(key, image)
  }
  setResponseHeaders(event, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' })
  return image
})
