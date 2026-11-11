import { CONTENT_LIMITS, DEFAULT_WHATSAPP, defaultContent, rsvpClosed, type AdminCampaign, type CampaignContent, type CampaignStatus, type PublicCampaign, type WhatsappTemplates } from '../../shared/campaign'
import { normaliseDesign, THEMES, type Design } from '../../shared/themes'
import { isLanguage, LANGUAGES, MAX_EXTRA_GUESTS, type Language, type PhotoInfo } from '../../shared/types'
import { hashPassword } from './auth'
import type { DB } from './db'
import { NotFoundError, ValidationError } from './errors'

export interface CampaignRow {
  id: number
  slug: string
  status: CampaignStatus
  password_hash: string | null
  design: string
  content: string
  whatsapp: string
  created_at: string
  updated_at: string
}

const now = () => new Date().toISOString()
const RESERVED = new Set(['www', 'admin', 'api', 'app', 'mail', 'static', 'assets', 'i', 'w'])

/** A slug becomes a DNS label: lowercase letters, digits and inner hyphens, 3 to 40 characters. */
export function validateSlug(value: unknown): string {
  const slug = typeof value === 'string' ? value.trim().toLowerCase() : ''
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug) || slug.includes('--')) {
    throw new ValidationError('slug_invalid', 'The address may use lowercase letters, digits and single hyphens, 3 to 40 characters, and must start and end with a letter or digit.')
  }
  if (RESERVED.has(slug)) throw new ValidationError('slug_reserved', `"${slug}" is reserved. Choose another address.`)
  return slug
}

// ----------------------------------------------------------------- content

const text = (value: unknown, limit: number, field: string): string => {
  // eslint-disable-next-line no-control-regex
  const v = typeof value === 'string' ? value.normalize('NFC').replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ').trim() : ''
  if (v.length > limit) throw new ValidationError('content_too_long', `${field} is limited to ${limit} characters.`)
  return v
}
const date = (value: unknown, field: string): string => {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v && (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T12:00:00Z`)))) throw new ValidationError('date_invalid', `${field} must be a date like 2027-05-20.`)
  return v
}
const time = (value: unknown, field: string): string => {
  const v = typeof value === 'string' ? value.trim() : ''
  if (v && !/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) throw new ValidationError('time_invalid', `${field} must be a time like 19:00.`)
  return v
}
/** Only http(s) links are accepted, so a saved link can never run script. */
const link = (value: unknown, field: string): string => {
  const v = text(value, CONTENT_LIMITS.url, field)
  if (!v) return ''
  let url: URL
  try { url = new URL(v) }
  catch { throw new ValidationError('url_invalid', `${field} must be a full link starting with https://`) }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new ValidationError('url_invalid', `${field} must be a link starting with https://`)
  return url.toString()
}

/** Validate a full content object sent by the admin. Unknown keys are dropped. */
export function validateContent(input: unknown): CampaignContent {
  const c = (input ?? {}) as Partial<CampaignContent> & Record<string, unknown>
  const base = defaultContent()
  const L: readonly Language[] = LANGUAGES
  const languages = Array.isArray(c.languages) ? [...new Set(c.languages.filter(isLanguage))] : base.languages
  if (!languages.length) throw new ValidationError('languages_required', 'Choose at least one language.')
  const guestLimit = Number(c.rsvp?.guestLimit ?? base.rsvp.guestLimit)
  if (!Number.isInteger(guestLimit) || guestLimit < 1 || guestLimit > MAX_EXTRA_GUESTS) {
    throw new ValidationError('guest_limit_invalid', `The guest limit must be between 1 and ${MAX_EXTRA_GUESTS}.`)
  }
  const per = <T>(make: (l: Language) => T) => Object.fromEntries(L.map(l => [l, make(l)])) as Record<Language, T>
  return {
    couple: per(l => ({ first: text(c.couple?.[l]?.first, CONTENT_LIMITS.name, 'A name'), second: text(c.couple?.[l]?.second, CONTENT_LIMITS.name, 'A name') })),
    date: date(c.date, 'The wedding date'),
    receptionTime: time(c.receptionTime, 'The reception time'),
    ceremonyTime: time(c.ceremonyTime, 'The ceremony time'),
    venue: per(l => ({ name: text(c.venue?.[l]?.name, CONTENT_LIMITS.venue, 'The venue name'), address: text(c.venue?.[l]?.address, CONTENT_LIMITS.address, 'The address') })),
    links: { googleMaps: link(c.links?.googleMaps, 'The Google Maps link'), waze: link(c.links?.waze, 'The Waze link') },
    dressCode: per(l => text(c.dressCode?.[l], CONTENT_LIMITS.paragraph, 'The dress code')),
    notes: per(l => text(c.notes?.[l], CONTENT_LIMITS.paragraph, 'The notes')),
    rsvpBy: date(c.rsvpBy, 'The reply-by date'),
    languages,
    copy: per(l => ({
      invite: text(c.copy?.[l]?.invite, CONTENT_LIMITS.line, 'The invitation line'),
      intro: text(c.copy?.[l]?.intro, CONTENT_LIMITS.paragraph, 'The opening paragraph'),
      footer: text(c.copy?.[l]?.footer, CONTENT_LIMITS.line, 'The closing line'),
    })),
    rsvp: {
      closed: c.rsvp?.closed === true,
      closeAfterDeadline: c.rsvp?.closeAfterDeadline === true,
      askDietary: c.rsvp?.askDietary !== false,
      askMessage: c.rsvp?.askMessage !== false,
      guestLimit,
    },
  }
}

export function validateWhatsapp(input: unknown): WhatsappTemplates {
  const next = { ...DEFAULT_WHATSAPP }
  for (const lang of LANGUAGES) {
    // A language the caller did not send keeps its standard message.
    const value = (input as Partial<WhatsappTemplates> | undefined)?.[lang] ?? DEFAULT_WHATSAPP[lang]
    if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new ValidationError('template_invalid', 'Each message needs some text, up to 2000 characters.')
    if (!value.includes('{link}')) throw new ValidationError('template_no_link', 'Each message must contain {link} so the guest receives their invitation.')
    next[lang] = value
  }
  return next
}

// ------------------------------------------------------------------- reads

const parse = <T>(json: string, fallback: T): T => {
  try { return { ...fallback, ...JSON.parse(json) } }
  catch { return fallback }
}
/** Stored content, with anything added to the model since it was saved (a new language, a new setting) filled in. */
export const contentOf = (row: CampaignRow): CampaignContent => {
  const base = defaultContent(), c = parse(row.content, base)
  return {
    ...c,
    couple: { ...base.couple, ...c.couple },
    venue: { ...base.venue, ...c.venue },
    dressCode: { ...base.dressCode, ...c.dressCode },
    notes: { ...base.notes, ...c.notes },
    copy: { ...base.copy, ...c.copy },
    languages: (c.languages ?? []).filter(isLanguage),
    rsvp: { ...base.rsvp, ...c.rsvp },
  }
}
export const designOf = (row: CampaignRow): Design => parse(row.design, { theme: 'nocturne', options: THEMES.nocturne!.defaults, customCss: '' })
export const whatsappOf = (row: CampaignRow): WhatsappTemplates => parse(row.whatsapp, DEFAULT_WHATSAPP)

export function getCampaign(db: DB, id: number): CampaignRow {
  const row = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(id) as CampaignRow | undefined
  if (!row) throw new NotFoundError('Campaign not found.')
  return row
}
export function getCampaignBySlug(db: DB, slug: unknown): CampaignRow | null {
  if (typeof slug !== 'string') return null
  return (db.prepare('SELECT * FROM campaigns WHERE slug = ?').get(slug.toLowerCase()) as CampaignRow | undefined) ?? null
}
export function listCampaigns(db: DB): CampaignRow[] {
  return db.prepare('SELECT * FROM campaigns ORDER BY id').all() as CampaignRow[]
}

export function toPublic(row: CampaignRow, photos: PhotoInfo): PublicCampaign {
  const content = contentOf(row)
  return { id: row.id, slug: row.slug, status: row.status, content, design: designOf(row), photos, rsvpClosed: rsvpClosed(content) }
}
export function toAdminCampaign(row: CampaignRow, photos: PhotoInfo, siteUrl: string): AdminCampaign {
  return { ...toPublic(row, photos), siteUrl, hasPassword: !!row.password_hash, whatsapp: whatsappOf(row), createdAt: row.created_at, updatedAt: row.updated_at }
}

// ------------------------------------------------------------------ writes

export function createCampaign(db: DB, input: { slug: unknown, couple?: unknown }): CampaignRow {
  const slug = validateSlug(input.slug)
  if (getCampaignBySlug(db, slug)) throw new ValidationError('slug_taken', `The address "${slug}" is already used by another campaign.`)
  const content = validateContent({ ...defaultContent(), couple: input.couple })
  const ts = now()
  const info = db.prepare('INSERT INTO campaigns (slug, status, design, content, whatsapp, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(slug, 'draft', JSON.stringify(normaliseDesign(null, slug)), JSON.stringify(content), JSON.stringify(DEFAULT_WHATSAPP), ts, ts)
  return getCampaign(db, Number(info.lastInsertRowid))
}

const touch = (db: DB, id: number, column: string, value: string | null) =>
  db.prepare(`UPDATE campaigns SET ${column} = ?, updated_at = ? WHERE id = ?`).run(value, now(), id)

export function setContent(db: DB, id: number, input: unknown): CampaignRow {
  getCampaign(db, id)
  touch(db, id, 'content', JSON.stringify(validateContent(input)))
  return getCampaign(db, id)
}

/** `customCss` is only applied when `allowCss` is set (the owner). */
export function setDesign(db: DB, id: number, input: unknown, allowCss: boolean): CampaignRow {
  const row = getCampaign(db, id)
  const design = normaliseDesign(input, row.slug, designOf(row))
  const css = (input as { customCss?: unknown } | null)?.customCss
  if (allowCss && typeof css === 'string') {
    if (css.length > 20_000) throw new ValidationError('css_too_long', 'Custom CSS is limited to 20,000 characters.')
    // The stylesheet is inlined in a <style> element: it must not be able to close it.
    design.customCss = css.replace(/<\/?style/gi, '')
  }
  touch(db, id, 'design', JSON.stringify(design))
  return getCampaign(db, id)
}

export function setWhatsapp(db: DB, id: number, input: unknown): CampaignRow {
  getCampaign(db, id)
  touch(db, id, 'whatsapp', JSON.stringify(validateWhatsapp(input)))
  return getCampaign(db, id)
}

export function setStatus(db: DB, id: number, status: unknown): CampaignRow {
  getCampaign(db, id)
  if (status !== 'draft' && status !== 'live' && status !== 'archived') throw new ValidationError('status_invalid', 'Unknown campaign status.')
  touch(db, id, 'status', status)
  return getCampaign(db, id)
}

export function setSlug(db: DB, id: number, value: unknown): CampaignRow {
  const row = getCampaign(db, id)
  const slug = validateSlug(value)
  const other = getCampaignBySlug(db, slug)
  if (other && other.id !== row.id) throw new ValidationError('slug_taken', `The address "${slug}" is already used by another campaign.`)
  touch(db, id, 'slug', slug)
  return getCampaign(db, id)
}

/** Set the couple's password. Every existing couple session for the campaign ends. */
export function setPassword(db: DB, id: number, password: unknown): void {
  getCampaign(db, id)
  if (typeof password !== 'string' || password.length < 10 || password.length > 200) throw new ValidationError('password_weak', 'The password must be at least 10 characters.')
  db.transaction(() => {
    touch(db, id, 'password_hash', hashPassword(password))
    db.prepare('DELETE FROM admin_sessions WHERE campaign_id = ?').run(id)
  })()
}

/** Remove a campaign with its invitations and sessions. Photos are removed by the caller. */
export function deleteCampaign(db: DB, id: number): void {
  getCampaign(db, id)
  db.transaction(() => {
    db.prepare('DELETE FROM invitations WHERE campaign_id = ?').run(id)
    db.prepare('DELETE FROM admin_sessions WHERE campaign_id = ?').run(id)
    db.prepare('DELETE FROM campaigns WHERE id = ?').run(id)
  })()
}
