import type { AdminInvitation, GuestInvitation, Language, RsvpInput, RsvpStatus, Stats } from '../../shared/types'
import { LIMITS, MAX_EXTRA_GUESTS } from '../../shared/types'
import type { DB } from './db'
import { NotFoundError, ValidationError } from './errors'
import { deriveToken, hashToken, looksLikeToken, newNonce } from './tokens'

export interface InvitationRow {
  id: number
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

function validateExtras(value: unknown, guestsAllowed: boolean): string[] {
  if (value == null) return []
  if (!Array.isArray(value)) throw new ValidationError('extra_guests_invalid', 'Additional guests must be a list of names.')
  if (value.length && !guestsAllowed) throw new ValidationError('guests_not_allowed', 'This invitation does not include additional guests.')
  if (value.length > MAX_EXTRA_GUESTS) throw new ValidationError('too_many_guests', `At most ${MAX_EXTRA_GUESTS} additional guests can be added.`)
  return value.map(v => validateName(v, 'guest_name'))
}

function validateNotes(value: unknown, limit: number, code: string): string {
  const text = cleanText(value, true)
  if (text.length > limit) throw new ValidationError(code, `This field is limited to ${limit} characters.`)
  return text
}

export function toGuest(row: InvitationRow): GuestInvitation {
  return {
    guestName: row.guest_name,
    language: row.language,
    guestsAllowed: row.guests_allowed === 1,
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

export function toAdmin(row: InvitationRow, secret: string, baseUrl: string): AdminInvitation {
  return {
    ...toGuest(row),
    id: row.id,
    url: `${baseUrl.replace(/\/+$/, '')}/i/${deriveToken(secret, row.token_nonce)}`,
    revoked: row.revoked_at !== null,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    confirmedCount: confirmedCount(row),
  }
}

export interface NewInvitation { guestName: unknown; guestsAllowed?: unknown; language?: unknown }

export function validateNewInvitation(input: NewInvitation) {
  const language: Language = input.language === 'en' ? 'en' : 'he'
  return { guestName: validateName(input.guestName), guestsAllowed: input.guestsAllowed === true, language }
}

export function createInvitation(db: DB, secret: string, input: NewInvitation): InvitationRow {
  const v = validateNewInvitation(input)
  const nonce = newNonce()
  const ts = now()
  const info = db.prepare(`
    INSERT INTO invitations (guest_name, language, token_hash, token_nonce, guests_allowed, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(v.guestName, v.language, hashToken(deriveToken(secret, nonce)), nonce, v.guestsAllowed ? 1 : 0, ts, ts)
  return getById(db, Number(info.lastInsertRowid))
}

export function getById(db: DB, id: number): InvitationRow {
  const row = db.prepare('SELECT * FROM invitations WHERE id = ?').get(id) as InvitationRow | undefined
  if (!row) throw new NotFoundError('Invitation not found.')
  return row
}

/** Returns the invitation for a link token, or null for unknown, malformed, and revoked tokens alike. */
export function getByToken(db: DB, token: unknown): InvitationRow | null {
  if (!looksLikeToken(token)) return null
  const row = db.prepare('SELECT * FROM invitations WHERE token_hash = ? AND revoked_at IS NULL').get(hashToken(token)) as InvitationRow | undefined
  return row ?? null
}

export function listInvitations(db: DB): InvitationRow[] {
  return db.prepare('SELECT * FROM invitations ORDER BY guest_name COLLATE NOCASE, id').all() as InvitationRow[]
}

/**
 * Record a guest's answer. Always updates the one existing row for this token;
 * submitting identical data again changes nothing.
 */
export function submitRsvp(db: DB, token: unknown, input: Partial<RsvpInput> | null | undefined): InvitationRow {
  const row = getByToken(db, token)
  if (!row) throw new NotFoundError('Invitation not found.')
  const body = input ?? {}
  if (body.rsvpStatus !== 'attending' && body.rsvpStatus !== 'declined') {
    throw new ValidationError('status_required', 'Please choose whether you are attending.')
  }
  const extras = body.rsvpStatus === 'attending' ? validateExtras(body.extraGuests, row.guests_allowed === 1) : []
  const dietary = validateNotes(body.dietaryNotes, LIMITS.notes, 'notes_too_long')
  const message = validateNotes(body.message, LIMITS.message, 'message_too_long')
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
  return getById(db, row.id)
}

export interface AdminPatch {
  guestName?: unknown
  guestsAllowed?: unknown
  language?: unknown
  rsvpStatus?: unknown
  extraGuests?: unknown
  dietaryNotes?: unknown
  sent?: unknown
}

export function updateInvitation(db: DB, id: number, patch: AdminPatch): InvitationRow {
  const row = getById(db, id)
  const guestName = patch.guestName === undefined ? row.guest_name : validateName(patch.guestName)
  const guestsAllowed = patch.guestsAllowed === undefined ? row.guests_allowed === 1 : patch.guestsAllowed === true
  const language: Language = patch.language === undefined ? row.language : patch.language === 'en' ? 'en' : 'he'
  let status = row.rsvp_status
  if (patch.rsvpStatus !== undefined) {
    if (patch.rsvpStatus !== 'pending' && patch.rsvpStatus !== 'attending' && patch.rsvpStatus !== 'declined') {
      throw new ValidationError('status_invalid', 'Unknown RSVP status.')
    }
    status = patch.rsvpStatus
  }
  // Extra guests only exist alongside an attending primary guest who may bring them.
  let extras = patch.extraGuests === undefined ? parseExtras(row.extra_guests) : validateExtras(patch.extraGuests, guestsAllowed)
  if (status !== 'attending' || !guestsAllowed) extras = []
  const dietary = patch.dietaryNotes === undefined ? row.dietary_notes : validateNotes(patch.dietaryNotes, LIMITS.notes, 'notes_too_long')
  const sentAt = patch.sent === undefined ? row.sent_at : patch.sent === true ? (row.sent_at ?? now()) : null

  db.prepare(`
    UPDATE invitations
    SET guest_name = ?, guests_allowed = ?, language = ?, rsvp_status = ?, extra_guests = ?, dietary_notes = ?, sent_at = ?, updated_at = ?
    WHERE id = ?
  `).run(guestName, guestsAllowed ? 1 : 0, language, status, JSON.stringify(extras), dietary, sentAt, now(), id)
  return getById(db, id)
}

export function deleteInvitation(db: DB, id: number): void {
  const info = db.prepare('DELETE FROM invitations WHERE id = ?').run(id)
  if (!info.changes) throw new NotFoundError('Invitation not found.')
}

/** Issue a new link. The old one stops working immediately. Also lifts a revocation. */
export function regenerateToken(db: DB, secret: string, id: number): InvitationRow {
  getById(db, id)
  const nonce = newNonce()
  db.prepare('UPDATE invitations SET token_nonce = ?, token_hash = ?, revoked_at = NULL, sent_at = NULL, updated_at = ? WHERE id = ?')
    .run(nonce, hashToken(deriveToken(secret, nonce)), now(), id)
  return getById(db, id)
}

export function setRevoked(db: DB, id: number, revoked: boolean): InvitationRow {
  const row = getById(db, id)
  db.prepare('UPDATE invitations SET revoked_at = ?, updated_at = ? WHERE id = ?')
    .run(revoked ? (row.revoked_at ?? now()) : null, now(), id)
  return getById(db, id)
}

export function computeStats(rows: InvitationRow[]): Stats {
  const stats: Stats = {
    invited: rows.length, sent: 0, pending: 0, accepted: 0, declined: 0,
    confirmedExtraGuests: 0, confirmedAttendees: 0, openEnded: 0, expectedIfAllPendingAttend: 0,
  }
  for (const row of rows) {
    if (row.sent_at) stats.sent++
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
