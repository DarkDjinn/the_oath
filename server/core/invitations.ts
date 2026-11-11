import type { AdminInvitation, GuestInvitation, Language, RsvpInput, RsvpStatus, Stats } from '../../shared/types'
import { isLanguage, LIMITS, MAX_EXTRA_GUESTS } from '../../shared/types'
import { contentOf, getCampaign } from './campaigns'
import type { DB } from './db'
import { rsvpClosed } from '../../shared/campaign'
import { NotFoundError, ValidationError } from './errors'
import { deriveToken, hashToken, looksLikeToken, newNonce } from './tokens'

export interface InvitationRow {
  id: number
  campaign_id: number
  guest_limit: number | null
  first_opened_at: string | null
  guest_name: string
  language: Language
  token_hash: string
  token_nonce: string
  revoked_at: string | null
  guests_allowed: 0 | 1
  rsvp_status: RsvpStatus
  extra_guests: string
  dietary_notes: string
  message: string
  sent_at: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

const now = () => new Date().toISOString()

/** Collapse whitespace and strip control characters; names keep any script and punctuation. */
export function cleanText(value: unknown, multiline = false): string {
  if (typeof value !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  const stripped = value.normalize('NFC').replace(multiline ? /[\u0000-\u0009\u000B-\u001F\u007F]/g : /[\u0000-\u001F\u007F]/g, ' ')
  return multiline ? stripped.trim() : stripped.replace(/\s+/g, ' ').trim()
}

export function validateName(value: unknown, field = 'name'): string {
  const name = cleanText(value)
  if (!name) throw new ValidationError(`${field}_required`, 'A name is required.')
  if (name.length > LIMITS.name) throw new ValidationError(`${field}_too_long`, `Names are limited to ${LIMITS.name} characters.`)
  return name
}

function parseExtras(json: string): string[] {
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed.filter((n): n is string => typeof n === 'string') : []
  }
  catch { return [] }
}

function validateExtras(value: unknown, limit: number): string[] {
  if (value == null) return []
  if (!Array.isArray(value)) throw new ValidationError('extra_guests_invalid', 'Additional guests must be a list of names.')
  if (value.length && limit === 0) throw new ValidationError('guests_not_allowed', 'This invitation does not include additional guests.')
  if (value.length > limit) throw new ValidationError('too_many_guests', `At most ${limit} additional ${limit === 1 ? 'guest' : 'guests'} can be added.`)
  return value.map(v => validateName(v, 'guest_name'))
}

/** How many guests this invitee may bring: their own limit, else the campaign's, never above the hard ceiling. */
export function guestLimitOf(row: Pick<InvitationRow, 'guests_allowed' | 'guest_limit'>, campaignLimit: number): number {
  if (row.guests_allowed !== 1) return 0
  return Math.min(row.guest_limit ?? campaignLimit, MAX_EXTRA_GUESTS)
}

function validateOwnLimit(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isInteger(n) || n < 0 || n > MAX_EXTRA_GUESTS) throw new ValidationError('guest_limit_invalid', `A guest limit must be between 0 and ${MAX_EXTRA_GUESTS}, or empty to use the campaign's.`)
  return n
}

function validateNotes(value: unknown, limit: number, code: string): string {
  const text = cleanText(value, true)
  if (text.length > limit) throw new ValidationError(code, `This field is limited to ${limit} characters.`)
  return text
}

export function toGuest(row: InvitationRow, campaignLimit = MAX_EXTRA_GUESTS): GuestInvitation {
  return {
    guestName: row.guest_name,
    language: row.language,
    guestsAllowed: row.guests_allowed === 1,
    guestLimit: guestLimitOf(row, campaignLimit),
    rsvpStatus: row.rsvp_status,
    extraGuests: parseExtras(row.extra_guests),
    dietaryNotes: row.dietary_notes,
    message: row.message,
    respondedAt: row.responded_at,
  }
}

export function confirmedCount(row: Pick<InvitationRow, 'rsvp_status' | 'extra_guests'>): number {
  return row.rsvp_status === 'attending' ? 1 + parseExtras(row.extra_guests).length : 0
}

/** `baseUrl` is the campaign's own site address; the link is `<baseUrl>/i/<token>`. */
export function toAdmin(row: InvitationRow, secret: string, baseUrl: string, campaignLimit = MAX_EXTRA_GUESTS): AdminInvitation {
  return {
    ...toGuest(row, campaignLimit),
    id: row.id,
    url: `${baseUrl.replace(/\/+$/, '')}/i/${deriveToken(secret, row.token_nonce)}`,
    revoked: row.revoked_at !== null,
    ownGuestLimit: row.guest_limit,
    firstOpenedAt: row.first_opened_at,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedCount: confirmedCount(row),
  }
}

export interface NewInvitation { guestName: unknown; guestsAllowed?: unknown; language?: unknown; guestLimit?: unknown }

export function validateNewInvitation(input: NewInvitation) {
  const language: Language = isLanguage(input.language) ? input.language : 'he'
  // Everyone may bring guests by default. Only an explicit `false`, or an own limit of 0, says otherwise.
  const limit = validateOwnLimit(input.guestLimit)
  const guestsAllowed = input.guestsAllowed !== false && limit !== 0
  return { guestName: validateName(input.guestName), guestsAllowed, language, guestLimit: guestsAllowed ? limit : null }
}

export function createInvitation(db: DB, secret: string, campaignId: number, input: NewInvitation): InvitationRow {
  const v = validateNewInvitation(input)
  const nonce = newNonce()
  const ts = now()
  const info = db.prepare(`
    INSERT INTO invitations (campaign_id, guest_name, language, token_hash, token_nonce, guests_allowed, guest_limit, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(campaignId, v.guestName, v.language, hashToken(deriveToken(secret, nonce)), nonce, v.guestsAllowed ? 1 : 0, v.guestsAllowed ? v.guestLimit : null, ts, ts)
  return getById(db, campaignId, Number(info.lastInsertRowid))
}

/** Always scoped to a campaign: an id from another campaign is "not found". */
export function getById(db: DB, campaignId: number, id: number): InvitationRow {
  const row = db.prepare('SELECT * FROM invitations WHERE id = ? AND campaign_id = ?').get(id, campaignId) as InvitationRow | undefined
  if (!row) throw new NotFoundError('Invitation not found.')
  return row
}

/** Returns the invitation for a link token, or null for unknown, malformed, and revoked tokens alike. */
export function getByToken(db: DB, token: unknown): InvitationRow | null {
  if (!looksLikeToken(token)) return null
  const row = db.prepare('SELECT * FROM invitations WHERE token_hash = ? AND revoked_at IS NULL').get(hashToken(token)) as InvitationRow | undefined
  return row ?? null
}

/** Record the first time a personal link is opened. */
export function markOpened(db: DB, row: InvitationRow): void {
  if (!row.first_opened_at) db.prepare('UPDATE invitations SET first_opened_at = ? WHERE id = ? AND first_opened_at IS NULL').run(now(), row.id)
}

export function listInvitations(db: DB, campaignId: number): InvitationRow[] {
  return db.prepare('SELECT * FROM invitations WHERE campaign_id = ? ORDER BY guest_name COLLATE NOCASE, id').all(campaignId) as InvitationRow[]
}

/**
 * Record a guest's answer. Always updates the one existing row for this token;
 * submitting identical data again changes nothing. Refused while the campaign
 * is not live or its replies are closed.
 */
export function submitRsvp(db: DB, token: unknown, input: Partial<RsvpInput> | null | undefined): InvitationRow {
  const row = getByToken(db, token)
  if (!row) throw new NotFoundError('Invitation not found.')
  const campaign = getCampaign(db, row.campaign_id)
  const content = contentOf(campaign)
  if (campaign.status !== 'live') throw new ValidationError('campaign_not_live', 'This invitation is not accepting replies.')
  if (rsvpClosed(content)) throw new ValidationError('rsvp_closed', 'Replies are closed. Please contact the couple directly.')

  const body = input ?? {}
  if (body.rsvpStatus !== 'attending' && body.rsvpStatus !== 'declined') {
    throw new ValidationError('status_required', 'Please choose whether you are attending.')
  }
  // A limit lowered after the guest answered never removes names already given; it only stops more being added.
  const limit = Math.max(guestLimitOf(row, content.rsvp.guestLimit), row.guests_allowed === 1 ? parseExtras(row.extra_guests).length : 0)
  const extras = body.rsvpStatus === 'attending' ? validateExtras(body.extraGuests, limit) : []
  const dietary = content.rsvp.askDietary ? validateNotes(body.dietaryNotes, LIMITS.notes, 'notes_too_long') : row.dietary_notes
  const message = content.rsvp.askMessage ? validateNotes(body.message, LIMITS.message, 'message_too_long') : row.message
  const extrasJson = JSON.stringify(extras)

  const unchanged = row.rsvp_status === body.rsvpStatus && row.extra_guests === extrasJson
    && row.dietary_notes === dietary && row.message === message
  if (unchanged) return row

  const ts = now()
  db.prepare(`
    UPDATE invitations
    SET rsvp_status = ?, extra_guests = ?, dietary_notes = ?, message = ?, responded_at = ?, updated_at = ?
    WHERE id = ?
  `).run(body.rsvpStatus, extrasJson, dietary, message, ts, ts, row.id)
  return getById(db, row.campaign_id, row.id)
}

export interface AdminPatch {
  guestName?: unknown
  guestsAllowed?: unknown
  guestLimit?: unknown
  language?: unknown
  rsvpStatus?: unknown
  extraGuests?: unknown
  dietaryNotes?: unknown
  sent?: unknown
}

export function updateInvitation(db: DB, campaignId: number, id: number, patch: AdminPatch): InvitationRow {
  const row = getById(db, campaignId, id)
  const guestName = patch.guestName === undefined ? row.guest_name : validateName(patch.guestName)
  // An own limit of 0 means "no guests"; any other limit (or clearing it) means they may bring guests.
  const patchedLimit = patch.guestLimit === undefined ? undefined : validateOwnLimit(patch.guestLimit)
  const guestsAllowed = patchedLimit !== undefined ? patchedLimit !== 0 && patch.guestsAllowed !== false
    : patch.guestsAllowed === undefined ? row.guests_allowed === 1 : patch.guestsAllowed === true
  const ownLimit = !guestsAllowed ? null : patchedLimit === undefined ? row.guest_limit : patchedLimit
  const language: Language = patch.language === undefined ? row.language : isLanguage(patch.language) ? patch.language : 'he'
  let status = row.rsvp_status
  if (patch.rsvpStatus !== undefined) {
    if (patch.rsvpStatus !== 'pending' && patch.rsvpStatus !== 'attending' && patch.rsvpStatus !== 'declined') {
      throw new ValidationError('status_invalid', 'Unknown RSVP status.')
    }
    status = patch.rsvpStatus
  }
  // Extra guests only exist alongside an attending primary guest who may bring them. An admin may exceed the guest's own limit.
  let extras = patch.extraGuests === undefined ? parseExtras(row.extra_guests) : validateExtras(patch.extraGuests, guestsAllowed ? MAX_EXTRA_GUESTS : 0)
  if (status !== 'attending' || !guestsAllowed) extras = []
  const dietary = patch.dietaryNotes === undefined ? row.dietary_notes : validateNotes(patch.dietaryNotes, LIMITS.notes, 'notes_too_long')
  const sentAt = patch.sent === undefined ? row.sent_at : patch.sent === true ? (row.sent_at ?? now()) : null

  db.prepare(`
    UPDATE invitations
    SET guest_name = ?, guests_allowed = ?, guest_limit = ?, language = ?, rsvp_status = ?, extra_guests = ?, dietary_notes = ?, sent_at = ?, updated_at = ?
    WHERE id = ?
  `).run(guestName, guestsAllowed ? 1 : 0, ownLimit, language, status, JSON.stringify(extras), dietary, sentAt, now(), id)
  return getById(db, campaignId, id)
}

export function deleteInvitation(db: DB, campaignId: number, id: number): void {
  const info = db.prepare('DELETE FROM invitations WHERE id = ? AND campaign_id = ?').run(id, campaignId)
  if (!info.changes) throw new NotFoundError('Invitation not found.')
}

/** Issue a new link. The old one stops working immediately. Also lifts a revocation. */
export function regenerateToken(db: DB, secret: string, campaignId: number, id: number): InvitationRow {
  getById(db, campaignId, id)
  const nonce = newNonce()
  db.prepare('UPDATE invitations SET token_nonce = ?, token_hash = ?, revoked_at = NULL, sent_at = NULL, first_opened_at = NULL, updated_at = ? WHERE id = ?')
    .run(nonce, hashToken(deriveToken(secret, nonce)), now(), id)
  return getById(db, campaignId, id)
}

export function setRevoked(db: DB, campaignId: number, id: number, revoked: boolean): InvitationRow {
  const row = getById(db, campaignId, id)
  db.prepare('UPDATE invitations SET revoked_at = ?, updated_at = ? WHERE id = ?')
    .run(revoked ? (row.revoked_at ?? now()) : null, now(), id)
  return getById(db, campaignId, id)
}

export function computeStats(rows: InvitationRow[]): Stats {
  const stats: Stats = {
    invited: rows.length, sent: 0, opened: 0, pending: 0, accepted: 0, declined: 0,
    confirmedExtraGuests: 0, confirmedAttendees: 0, openEnded: 0, expectedIfAllPendingAttend: 0,
  }
  for (const row of rows) {
    if (row.sent_at) stats.sent++
    if (row.first_opened_at) stats.opened++
    if (row.rsvp_status === 'pending') stats.pending++
    else if (row.rsvp_status === 'declined') stats.declined++
    else {
      stats.accepted++
      stats.confirmedExtraGuests += parseExtras(row.extra_guests).length
    }
    if (row.guests_allowed === 1 && row.rsvp_status !== 'declined') stats.openEnded++
  }
  stats.confirmedAttendees = stats.accepted + stats.confirmedExtraGuests
  stats.expectedIfAllPendingAttend = stats.confirmedAttendees + stats.pending
  return stats
}
