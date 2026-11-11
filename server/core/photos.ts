import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { PhotoInfo } from '../../shared/types'

export const PHOTO_SLOTS = ['hero', 'second'] as const
export const PHOTO_WIDTHS = [480, 800, 1200, 1800]
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']

export const photosDir = () => process.env.PHOTOS_DIR || './data/photos'

/** Path of `hero.*` / `second.*` in the photos directory, if the file exists. */
export function photoFile(slot: string): { path: string; version: string } | null {
  let files: string[]
  try { files = readdirSync(photosDir()) }
  catch { return null }
  const match = files.find((f) => {
    const [name, ext] = f.toLowerCase().split('.')
    return name === slot && !!ext && EXTENSIONS.includes(ext)
  })
  if (!match) return null
  const path = join(photosDir(), match)
  return { path, version: Math.floor(statSync(path).mtimeMs).toString(36) }
}

/** A photo slot is "on" simply because its file exists. The value is a cache-busting version. */
export function findPhotos(): PhotoInfo {
  return { hero: photoFile('hero')?.version ?? null, second: photoFile('second')?.version ?? null }
}
