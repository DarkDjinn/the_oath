import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs'
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

// ------------------------------------------------------------------ recent photos
// Every uploaded photo is also kept in the campaign's library (<photos>/<id>/library/<photo>.webp),
// the last LIBRARY_SIZE by use, so the couple can switch between photos without uploading again.
// A photo's id is a hash of its image, so the same picture uploaded twice is kept once. The
// library is for the admin only: guests only ever see the photos set on the page.

export const LIBRARY_SIZE = 20
export const isLibraryId = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{16}$/.test(value)
const libraryDir = (campaignId: number) => join(campaignPhotosDir(campaignId), 'library')
const libraryPath = (campaignId: number, id: string) => join(libraryDir(campaignId), `${id}.webp`)

export interface LibraryPhoto { id: string; usedAt: string; version: string }

/** Marks a library photo as just used, so it is the last to be let go. */
function touch(path: string) {
  const now = new Date()
  utimesSync(path, now, now)
}

/** Keeps an (already re-encoded) image in the library, or refreshes it if it is there. Returns its id. */
export function addToLibrary(campaignId: number, image: Buffer): string {
  const id = createHash('sha256').update(image).digest('hex').slice(0, 16)
  const path = libraryPath(campaignId, id)
  mkdirSync(libraryDir(campaignId), { recursive: true })
  if (existsSync(path)) touch(path)
  else writeFileSync(path, image)
  trimLibrary(campaignId)
  return id
}

/** The photos in the library, most recently used first. */
export function listLibrary(campaignId: number): LibraryPhoto[] {
  seedLibrary(campaignId)
  return libraryIds(campaignId).map(({ id, t }) => ({ id, usedAt: new Date(t).toISOString(), version: Math.floor(t).toString(36) }))
}

/** Drops the oldest photos beyond LIBRARY_SIZE. */
function trimLibrary(campaignId: number) {
  for (const { id } of libraryIds(campaignId).slice(LIBRARY_SIZE)) rmSync(libraryPath(campaignId, id), { force: true })
}
/** The library's photo ids with their last use, newest first. */
function libraryIds(campaignId: number): { id: string, t: number }[] {
  try {
    const dir = libraryDir(campaignId)
    return readdirSync(dir).filter(f => f.endsWith('.webp') && isLibraryId(f.slice(0, -5)))
      .map(f => ({ id: f.slice(0, -5), t: statSync(join(dir, f)).mtimeMs }))
      .sort((a, b) => b.t - a.t || a.id.localeCompare(b.id))
  }
  catch { return [] }
}

/** Photos set before the library existed join it once, so the list never starts out empty. */
function seedLibrary(campaignId: number) {
  if (existsSync(libraryDir(campaignId))) return
  for (const slot of PHOTO_SLOTS) {
    const file = photoFile(campaignId, slot)
    if (!file) continue
    const image = readFileSyncSafe(file.path)
    if (image) addToLibrary(campaignId, image)
  }
  mkdirSync(libraryDir(campaignId), { recursive: true })
}
function readFileSyncSafe(path: string): Buffer | null {
  try { return readFileSync(path) }
  catch { return null }
}

/** The library photo's file, if it exists. */
export function libraryFile(campaignId: number, id: string): { path: string; version: string } | null {
  if (!isLibraryId(id)) return null
  const path = libraryPath(campaignId, id)
  if (!existsSync(path)) return null
  return { path, version: Math.floor(statSync(path).mtimeMs).toString(36) }
}

/** Sets a slot to a library photo (a copy, so forgetting the photo later never empties the page). */
export function useLibraryPhoto(campaignId: number, slot: PhotoSlot, id: string): boolean {
  const file = libraryFile(campaignId, id)
  if (!file) return false
  removePhoto(campaignId, slot)
  copyFileSync(file.path, photoTarget(campaignId, slot))
  touch(file.path)
  return true
}

/** Which library photo each slot shows (null when the slot is empty or its photo has left the library). */
export function libraryInUse(campaignId: number): Record<PhotoSlot, string | null> {
  const out = { hero: null, second: null } as Record<PhotoSlot, string | null>
  for (const slot of PHOTO_SLOTS) {
    const file = photoFile(campaignId, slot)
    const bytes = file && readFileSyncSafe(file.path)
    const id = bytes ? createHash('sha256').update(bytes).digest('hex').slice(0, 16) : null
    out[slot] = id && libraryFile(campaignId, id) ? id : null
  }
  return out
}

export function forgetLibraryPhoto(campaignId: number, id: string): void {
  if (isLibraryId(id)) rmSync(libraryPath(campaignId, id), { force: true })
}
