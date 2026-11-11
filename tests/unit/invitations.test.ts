import { describe, expect, it } from 'vitest'
import { MAX_EXTRA_GUESTS } from '../../shared/types'
import { NotFoundError, ValidationError } from '../../server/core/errors'
import {
  computeStats, confirmedCount, createInvitation, deleteInvitation, getByToken, listInvitations,
  regenerateToken, setRevoked, submitRsvp, toGuest, updateInvitation,
} from '../../server/core/invitations'
import { hashToken } from '../../server/core/tokens'
import { admin, BASE, freshDb, invite, SECRET, tokenOf } from './helpers'

describe('creating invitations', () => {
  it('creates a pending invitation for one primary guest', () => {
    const db = freshDb()
    const row = invite(db, '  דניאל   כהן ', true)
    expect(row.guest_name).toBe('דניאל כהן')
    expect(row.rsvp_status).toBe('pending')
    expect(row.guests_allowed).toBe(1)
    expect(row.language).toBe('he')
    expect(row.created_at).toBe(row.updated_at)
  })

  it('stores the chosen language per invitation', () => {
    const db = freshDb()
    expect(createInvitation(db, SECRET, { guestName: 'Alex', language: 'en' }).language).toBe('en')
    expect(createInvitation(db, SECRET, { guestName: 'Alex', language: 'fr' }).language).toBe('he')
  })

  it('rejects empty and over-long names', () => {
    const db = freshDb()
    expect(() => invite(db, '   ')).toThrow(ValidationError)
    expect(() => invite(db, 'x'.repeat(81))).toThrow(ValidationError)
  })
})

describe('invitation tokens', () => {
  it('are 256-bit, URL-safe, unique, and never stored in the database', () => {
    const db = freshDb()
    const tokens = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const row = invite(db, `Guest ${i}`)
      const token = tokenOf(row)
      expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/) // 32 bytes, base64url
      expect(row.token_hash).toBe(hashToken(token))
      expect(JSON.stringify(row)).not.toContain(token)
      tokens.add(token)
    }
    expect(tokens.size).toBe(200)
  })

  it('cannot be derived without the server secret', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    const forged = admin(row).url.replace(BASE, '')
    expect(forged).toBe(`/i/${tokenOf(row)}`)
    expect(getByToken(db, tokenOf({ ...row, token_nonce: row.token_nonce }))).not.toBeNull()
    // Same nonce, different secret: a leaked database alone yields no working link.
    const other = createInvitation(freshDb(), 'another-secret-another-secret-012345', { guestName: 'Guest' })
    expect(getByToken(db, tokenOf(other))).toBeNull()
  })

  it('loads an invitation by its token and exposes only that guest', () => {
    const db = freshDb()
    const a = invite(db, 'Daniel Cohen', true)
    invite(db, 'Someone Else')
    const guest = toGuest(getByToken(db, tokenOf(a))!)
    expect(guest.guestName).toBe('Daniel Cohen')
    expect(JSON.stringify(guest)).not.toContain('Someone Else')
    expect(guest).not.toHaveProperty('id')
    expect(guest).not.toHaveProperty('url')
  })

  it('rejects invalid, malformed and revoked tokens', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    const token = tokenOf(row)
    for (const bad of ['', 'nope', token.slice(1), `${token}x`, token.replace(/.$/, '!'), null, undefined, 42, { token }]) {
      expect(getByToken(db, bad)).toBeNull()
    }
    setRevoked(db, row.id, true)
    expect(getByToken(db, token)).toBeNull()
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending' })).toThrow(NotFoundError)
    setRevoked(db, row.id, false)
    expect(getByToken(db, token)).not.toBeNull()
  })

  it('regenerating replaces the link, keeps the RSVP, and clears the sent mark', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    const oldToken = tokenOf(row)
    submitRsvp(db, oldToken, { rsvpStatus: 'attending' })
    updateInvitation(db, row.id, { sent: true })
    const next = regenerateToken(db, SECRET, row.id)
    expect(getByToken(db, oldToken)).toBeNull()
    expect(getByToken(db, tokenOf(next))?.rsvp_status).toBe('attending')
    expect(next.sent_at).toBeNull()
  })
})

describe('RSVP', () => {
  it('records acceptance', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    const saved = submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', dietaryNotes: ' vegan ', message: 'מזל טוב!' })
    expect(saved.rsvp_status).toBe('attending')
    expect(saved.dietary_notes).toBe('vegan')
    expect(saved.message).toBe('מזל טוב!')
    expect(saved.responded_at).not.toBeNull()
    expect(confirmedCount(saved)).toBe(1)
  })

  it('records a decline, and a declining guest brings nobody', () => {
    const db = freshDb()
    const row = invite(db, 'Guest', true)
    const saved = submitRsvp(db, tokenOf(row), { rsvpStatus: 'declined', extraGuests: ['Plus One'] })
    expect(saved.rsvp_status).toBe('declined')
    expect(toGuest(saved).extraGuests).toEqual([])
    expect(confirmedCount(saved)).toBe(0)
  })

  it('requires an explicit answer', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest'))
    for (const body of [null, {}, { rsvpStatus: 'pending' }, { rsvpStatus: 'maybe' }]) {
      expect(() => submitRsvp(db, token, body as never)).toThrow(ValidationError)
    }
    expect(listInvitations(db)[0]!.rsvp_status).toBe('pending')
  })

  it('lets an allowed guest bring any number of named guests', () => {
    const db = freshDb()
    const row = invite(db, 'נועה ישראלי', true)
    const saved = submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['תום ישראלי', 'Child One', 'Child Two'] })
    expect(toGuest(saved).extraGuests).toEqual(['תום ישראלי', 'Child One', 'Child Two'])
    expect(confirmedCount(saved)).toBe(4)
  })

  it('refuses additional guests when the admin did not allow them', () => {
    const db = freshDb()
    const row = invite(db, 'Guest', false)
    expect(() => submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['Sneaky'] })).toThrow(/does not include additional guests/)
    expect(listInvitations(db)[0]!.rsvp_status).toBe('pending')
  })

  it('refuses unnamed guests, non-list input, and more than the safety cap', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest', true))
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['Ok', '  '] })).toThrow(ValidationError)
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: 'Bob' as never })).toThrow(ValidationError)
    const tooMany = Array.from({ length: MAX_EXTRA_GUESTS + 1 }, (_, i) => `Guest ${i}`)
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: tooMany })).toThrow(/At most/)
    expect(submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: tooMany.slice(1) }).rsvp_status).toBe('attending')
  })

  it('enforces field length limits', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest'))
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', dietaryNotes: 'x'.repeat(501) })).toThrow(ValidationError)
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', message: 'x'.repeat(1001) })).toThrow(ValidationError)
  })

  it('updates the same record when a guest changes their answer', () => {
    const db = freshDb()
    const row = invite(db, 'Guest', true)
    const token = tokenOf(row)
    submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A', 'B'] })
    submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A'] })
    const final = submitRsvp(db, token, { rsvpStatus: 'declined' })
    expect(listInvitations(db)).toHaveLength(1)
    expect(final.id).toBe(row.id)
    expect(final.rsvp_status).toBe('declined')
    expect(final.extra_guests).toBe('[]')
  })

  it('is idempotent: resubmitting identical data changes nothing', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest', true))
    const first = submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A'], dietaryNotes: '', message: '' })
    const again = submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: [' A '], dietaryNotes: '', message: '' })
    expect(again).toEqual(first)
  })
})

describe('admin edits', () => {
  it('edits names, flags and status, and marks sent with a timestamp', () => {
    const db = freshDb()
    const row = invite(db, 'Old Name')
    const sent = updateInvitation(db, row.id, { guestName: 'New Name', guestsAllowed: true, language: 'en', sent: true })
    expect(sent.guest_name).toBe('New Name')
    expect(sent.guests_allowed).toBe(1)
    expect(sent.language).toBe('en')
    expect(sent.sent_at).not.toBeNull()
    expect(updateInvitation(db, row.id, { sent: true }).sent_at).toBe(sent.sent_at) // not re-stamped
    expect(updateInvitation(db, row.id, { sent: false }).sent_at).toBeNull()
  })

  it('drops additional guests when they are disallowed or the guest is no longer attending', () => {
    const db = freshDb()
    const row = invite(db, 'Guest', true)
    submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['A', 'B'] })
    expect(updateInvitation(db, row.id, { rsvpStatus: 'pending' }).extra_guests).toBe('[]')
    updateInvitation(db, row.id, { rsvpStatus: 'attending', extraGuests: ['A'] })
    expect(updateInvitation(db, row.id, { guestsAllowed: false }).extra_guests).toBe('[]')
    expect(() => updateInvitation(db, row.id, { rsvpStatus: 'attending', extraGuests: ['A'] })).toThrow(ValidationError)
  })

  it('deletes an invitation and its link', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    deleteInvitation(db, row.id)
    expect(getByToken(db, tokenOf(row))).toBeNull()
    expect(() => deleteInvitation(db, row.id)).toThrow(NotFoundError)
  })
})

describe('counting', () => {
  it('keeps invitations, people and attendees apart', () => {
    const db = freshDb()
    const solo = invite(db, 'Solo attending')
    const family = invite(db, 'Family attending', true)
    const alone = invite(db, 'Allowed but alone', true)
    const no = invite(db, 'Declined', true)
    invite(db, 'Pending, may bring', true)
    invite(db, 'Pending, alone')
    submitRsvp(db, tokenOf(solo), { rsvpStatus: 'attending' })
    submitRsvp(db, tokenOf(family), { rsvpStatus: 'attending', extraGuests: ['Spouse', 'Kid 1', 'Kid 2'] })
    submitRsvp(db, tokenOf(alone), { rsvpStatus: 'attending' })
    submitRsvp(db, tokenOf(no), { rsvpStatus: 'declined' })
    updateInvitation(db, solo.id, { sent: true })
    updateInvitation(db, family.id, { sent: true })

    expect(computeStats(listInvitations(db))).toEqual({
      invited: 6,
      sent: 2,
      pending: 2,
      accepted: 3,
      declined: 1,
      confirmedExtraGuests: 3,
      confirmedAttendees: 6, // 3 invited guests + 3 they bring
      openEnded: 3, // family, alone, and the pending guest who may bring others
      expectedIfAllPendingAttend: 8,
    })
  })

  it('counts nothing for an empty list', () => {
    expect(computeStats([]).confirmedAttendees).toBe(0)
  })
})
