import { readFile } from 'node:fs/promises'
import sharp from 'sharp'
import { isSlot, PHOTO_WIDTHS, photoFile } from '../../../core/photos'

/** Resized WebP variants, kept in memory per campaign, slot and width. */
const cache = new Map<string, Buffer>()

export default defineEventHandler(async (event) => {
  const cid = Number(getRouterParam(event, 'cid'))
  const slot = getRouterParam(event, 'slot')
  const width = Number(getQuery(event).w) || 1200
  const file = Number.isInteger(cid) && cid > 0 && isSlot(slot) && PHOTO_WIDTHS.includes(width) ? photoFile(cid, slot) : null
  if (!file) throw createError({ statusCode: 404, message: 'Not found.' })

  const prefix = `${cid}:${slot}:${width}:`, key = prefix + file.version
  let image = cache.get(key)
  if (!image) {
    // Read the bytes ourselves: given a path, sharp may answer from its own cache of that file, i.e. the photo it replaced.
    image = await sharp(await readFile(file.path)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
    for (const k of cache.keys()) if (k.startsWith(prefix)) cache.delete(k)
    if (cache.size > 200) cache.clear()
    cache.set(key, image)
  }
  setResponseHeaders(event, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' })
  return image
})
