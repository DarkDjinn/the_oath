import { describe, expect, it } from 'vitest'
import { parseCsv, safeCell, toCsv } from '../../server/core/csv'
import { ValidationError } from '../../server/core/errors'
import { invitationsCsv, plannerCsv, templateCsv } from '../../server/core/exports'
import { buildPreview, commitImport } from '../../server/core/importer'
import { getByToken, listInvitations, submitRsvp, updateInvitation } from '../../server/core/invitations'
import { admin, BASE, freshDb, invite, SECRET, tokenOf } from './helpers'

describe('CSV parsing', () => {
  it('handles a BOM, CRLF, quotes, embedded commas and line breaks', () => {
    const rows = parseCsv('﻿name,plus_one_allowed\r\n"Cohen, Daniel",true\r\n"Line\nbreak",false\r\n"He said ""hi""",1\r\n')
    expect(rows).toEqual([['name', 'plus_one_allowed'], ['Cohen, Daniel', 'true'], ['Line\nbreak', 'false'], ['He said "hi"', '1']])
  })

  it('reads semicolon and tab separated files that Excel produces in some locales', () => {
    expect(parseCsv('name;plus_one_allowed\nדניאל;true')).toEqual([['name', 'plus_one_allowed'], ['דניאל', 'true']])
    expect(parseCsv('name\tplus_one_allowed\nדניאל\ttrue')).toEqual([['name', 'plus_one_allowed'], ['דניאל', 'true']])
  })
})

describe('CSV import preview', () => {
  it('creates one invitation per row, with Hebrew names intact', () => {
    const preview = buildPreview('﻿name,plus_one_allowed\nדניאל כהן,true\nAlex Levi,false\n  נועה ישראלי  ,TRUE\n', [])
    expect(preview.fileErrors).toEqual([])
    expect(preview.rows.map(r => [r.row, r.name, r.guestsAllowed])).toEqual([[2, 'דניאל כהן', true], [3, 'Alex Levi', false], [4, 'נועה ישראלי', true]])
    expect(preview.totals).toEqual({ rows: 3, valid: 3, withGuestsAllowed: 2, errors: 0, warnings: 0 })
  })

  it('accepts an optional language column and common boolean spellings', () => {
    const preview = buildPreview('name,plus_one_allowed,language\nA,yes,en\nB,כן,\nC,0,HE\nD,,he', [])
    expect(preview.rows.map(r => [r.guestsAllowed, r.language])).toEqual([[true, 'en'], [true, 'he'], [false, 'he'], [false, 'he']])
  })

  it('reports errors with spreadsheet row numbers', () => {
    const preview = buildPreview('name,plus_one_allowed,language\n,true,\nBob,maybe,\nEve,true,fr\n' + 'x'.repeat(81) + ',false,\n', [])
    expect(preview.rows.map(r => r.row)).toEqual([2, 3, 4, 5])
    expect(preview.rows[0]!.errors[0]).toMatch(/name is empty/)
    expect(preview.rows[1]!.errors[0]).toMatch(/must be true or false, found "maybe"/)
    expect(preview.rows[2]!.errors[0]).toMatch(/must be he or en/)
    expect(preview.rows[3]!.errors[0]).toMatch(/longer than 80/)
    expect(preview.totals.errors).toBe(4)
  })

  it('skips blank lines without shifting row numbers', () => {
    const preview = buildPreview('name,plus_one_allowed\nA,true\n,\n\nB,false\n', [])
    expect(preview.rows.map(r => [r.row, r.name])).toEqual([[2, 'A'], [5, 'B']])
  })

  it('rejects files without a usable header or without rows', () => {
    expect(buildPreview('', []).fileErrors[0]).toMatch(/empty/)
    expect(buildPreview('Daniel,true\nAlex,false', []).fileErrors[0]).toMatch(/"name" column/)
    expect(buildPreview('name,plus_one_allowed\n', []).fileErrors[0]).toMatch(/no guest rows/)
  })

  it('warns about repeated names without treating them as the same person', () => {
    const preview = buildPreview('name,plus_one_allowed\nDavid Levi,true\ndavid  levi,false\nNew Guest,false', ['New Guest'])
    expect(preview.rows[0]!.warnings).toEqual([])
    expect(preview.rows[1]!.warnings[0]).toMatch(/Same name as row 2/)
    expect(preview.rows[2]!.warnings[0]).toMatch(/already exists/)
    expect(preview.totals).toMatchObject({ valid: 3, errors: 0, warnings: 2 })
  })
})

describe('CSV import commit', () => {
  it('creates invitations with working, distinct links', () => {
    const db = freshDb()
    const created = commitImport(db, SECRET, 'name,plus_one_allowed\nדניאל כהן,true\nDavid Levi,false\nDavid Levi,false\n')
    expect(created).toHaveLength(3)
    expect(new Set(created.map(tokenOf)).size).toBe(3)
    expect(getByToken(db, tokenOf(created[0]!))?.guest_name).toBe('דניאל כהן')
    expect(created[0]!.guests_allowed).toBe(1)
  })

  it('writes nothing when any included row is invalid', () => {
    const db = freshDb()
    expect(() => commitImport(db, SECRET, 'name,plus_one_allowed\nGood One,true\n,true\nGood Two,false\n')).toThrow(ValidationError)
    expect(listInvitations(db)).toHaveLength(0)
  })

  it('rolls back the whole import if a write fails midway', () => {
    const db = freshDb()
    db.exec(`CREATE TRIGGER fail_on_third BEFORE INSERT ON invitations WHEN NEW.guest_name = 'Third' BEGIN SELECT RAISE(ABORT, 'disk full'); END`)
    expect(() => commitImport(db, SECRET, 'name\nFirst\nSecond\nThird\nFourth\n')).toThrow(/disk full/)
    expect(listInvitations(db)).toHaveLength(0)
  })

  it('imports the rest when invalid or unwanted rows are unticked', () => {
    const db = freshDb()
    const created = commitImport(db, SECRET, 'name,plus_one_allowed\nGood One,true\n,true\nGood Two,false\n', [3])
    expect(created.map(r => r.guest_name)).toEqual(['Good One', 'Good Two'])
    expect(() => commitImport(db, SECRET, 'name\nOnly\n', [2])).toThrow(/No rows are selected/)
  })

  it('never touches existing invitations or their RSVPs', () => {
    const db = freshDb()
    const existing = invite(db, 'Daniel Cohen', true)
    submitRsvp(db, tokenOf(existing), { rsvpStatus: 'attending', extraGuests: ['Maya Cohen'] })
    const before = listInvitations(db)[0]

    commitImport(db, SECRET, 'name,plus_one_allowed\nDaniel Cohen,false\n')
    const all = listInvitations(db)
    expect(all).toHaveLength(2)
    expect(all.find(r => r.id === existing.id)).toEqual(before)
  })
})

describe('CSV export', () => {
  it('neutralises formula injection', () => {
    for (const evil of ['=HYPERLINK("http://evil","x")', '+1+1', '-2+3', '@SUM(A1)', '\tcmd', '\rcmd']) {
      expect(safeCell(evil).replace(/^"/, '')).toMatch(/^'/)
    }
    expect(safeCell('Daniel')).toBe('Daniel')
    expect(safeCell(-5)).toBe('-5') // real numbers are left alone
    const db = freshDb()
    const row = invite(db, '=cmd|calc', true)
    submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['+evil'], dietaryNotes: '@notes' })
    const csv = plannerCsv(listInvitations(db).map(admin))
    expect(csv).toContain(`'=cmd|calc`)
    expect(csv).toContain(`'+evil`)
    expect(csv).toContain(`'@notes`)
    expect(parseCsv(csv).flat().some(cell => /^[=+\-@]/.test(cell))).toBe(false)
  })

  it('escapes commas, quotes and line breaks, and starts with a BOM for Excel', () => {
    const csv = toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 'שלום']])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv).toContain('\r\n')
    expect(parseCsv(csv)).toEqual([['a', 'b'], ['x,y', 'say "hi"'], ['line\nbreak', 'שלום']])
  })

  it('planner export has one row per confirmed attendee, guests referencing who invited them', () => {
    const db = freshDb()
    const a = invite(db, 'דניאל כהן', true)
    const b = invite(db, 'Alex Levi')
    const c = invite(db, 'Declined Guest', true)
    invite(db, 'Pending Guest')
    submitRsvp(db, tokenOf(a), { rsvpStatus: 'attending', extraGuests: ['מאיה כהן', 'Kid'], dietaryNotes: 'צמחוני' })
    submitRsvp(db, tokenOf(b), { rsvpStatus: 'attending' })
    submitRsvp(db, tokenOf(c), { rsvpStatus: 'declined' })

    const rows = parseCsv(plannerCsv(listInvitations(db).map(admin)))
    expect(rows[0]).toEqual(['Name', 'Type', 'Guest of', 'Dietary and accessibility notes', 'Confirmed at'])
    expect(rows.slice(1).map(r => r.slice(0, 4))).toEqual([
      ['Alex Levi', 'Invited guest', '', ''],
      ['דניאל כהן', 'Invited guest', '', 'צמחוני'],
      ['מאיה כהן', 'Additional guest', 'דניאל כהן', ''],
      ['Kid', 'Additional guest', 'דניאל כהן', ''],
    ])
  })

  it('invitation export lists every invitation with its link and status', () => {
    const db = freshDb()
    const a = invite(db, 'דניאל כהן', true)
    const b = invite(db, 'Revoked Guest')
    submitRsvp(db, tokenOf(a), { rsvpStatus: 'attending', extraGuests: ['מאיה כהן'] })
    updateInvitation(db, a.id, { sent: true })
    db.prepare('UPDATE invitations SET revoked_at = ? WHERE id = ?').run(new Date().toISOString(), b.id)

    const rows = parseCsv(invitationsCsv(listInvitations(db).map(admin)))
    expect(rows[0]).toEqual(['Guest name', 'Invitation URL', 'Guests allowed', 'Language', 'Sent', 'RSVP status', 'Confirmed attendees', 'Last response'])
    const daniel = rows.find(r => r[0] === 'דניאל כהן')!
    expect(daniel.slice(1, 7)).toEqual([`${BASE}/i/${tokenOf(a)}`, 'yes', 'he', 'yes', 'attending', '2'])
    expect(rows.find(r => r[0] === 'Revoked Guest')![1]).toBe('(link revoked)')
  })

  it('the downloadable template imports cleanly', () => {
    const preview = buildPreview(templateCsv(), [])
    expect(preview.totals).toMatchObject({ rows: 3, valid: 3, errors: 0 })
  })
})
