import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { PhotoInfo } from '../../shared/types'

export const PHOTO_SLOTS = ['hero', 'second'] as const
export type PhotoSlot = typeof PHOTO_SLOTS[number]
export const PHOTO_WIDTHS = [480, 800, 1200, 1800]
export const PHOTO_MAX_BYTES = 12 * 1024 * 1024
const EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'avif']

export const photosRoot = () => process.env.PHOTOS_DIR || './data/photos'
/** Each campaign has its own folder: <photos>/<campaign id>/hero.webp */
export const campaignPhotosDir = (campaignId: number) => join(photosRoot(), String(campaignId))
export const isSlot = (value: unknown): value is PhotoSlot => (PHOTO_SLOTS as readonly unknown[]).includes(value)

/** Path of `hero.*` / `second.*` in a campaign's folder, if the file exists. */
export function photoFile(campaignId: number, slot: PhotoSlot): { path: string; version: string } | null {
  const dir = campaignPhotosDir(campaignId)
  let files: string[]
  try { files = readdirSync(dir) }
  catch { return null }
  const match = files.find((f) => {
    const [name, ext] = f.toLowerCase().split('.')
    return name === slot && !!ext && EXTENSIONS.includes(ext)
  })
  if (!match) return null
  const path = join(dir, match)
  return { path, version: Math.floor(statSync(path).mtimeMs).toString(36) }
}

/** A photo slot is "on" simply because its file exists. The value is a cache-busting version. */
export function findPhotos(campaignId: number): PhotoInfo {
  return { hero: photoFile(campaignId, 'hero')?.version ?? null, second: photoFile(campaignId, 'second')?.version ?? null }
}

export function removePhoto(campaignId: number, slot: PhotoSlot): void {
  for (let file = photoFile(campaignId, slot); file; file = photoFile(campaignId, slot)) rmSync(file.path, { force: true })
}

export function photoTarget(campaignId: number, slot: PhotoSlot): string {
  mkdirSync(campaignPhotosDir(campaignId), { recursive: true })
  return join(campaignPhotosDir(campaignId), `${slot}.webp`)
}

export function removeCampaignPhotos(campaignId: number): void {
  rmSync(campaignPhotosDir(campaignId), { recursive: true, force: true })
}
