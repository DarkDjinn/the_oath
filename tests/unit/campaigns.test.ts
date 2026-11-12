import Database from 'better-sqlite3'
import { describe, expect, it } from 'vitest'
import { defaultContent, rsvpClosed } from '../../shared/campaign'
import { contrast } from '../../shared/design/colour'
import { DEFAULT_LETTERING, FONT_ROLES, FONTS, fontsForRole, fontsInUse, letteringVars, normaliseLettering, type FontRole } from '../../shared/design/fonts'
import { designTokens, tokenVars } from '../../shared/design/tokens'
import { colourProblems, fixColours, normaliseDesign, PRESETS, readDesign } from '../../shared/themes'
import { getSession, createSession, verifyPassword } from '../../server/core/auth'
import {
  contentOf, createCampaign, deleteCampaign, DESIGN_VERSIONS_KEPT, designOf, getCampaign, getCampaignBySlug, listCampaigns, listDesignVersions,
  restoreDesignVersion, setContent, setDesign, setPassword, setSlug, setStatus, setWhatsapp, validateContent, validateSlug,
} from '../../server/core/campaigns'
import { migrate } from '../../server/core/db'
import { NotFoundError, ValidationError } from '../../server/core/errors'
import { buildPreview, commitImport } from '../../server/core/importer'
import { createInvitation, deleteInvitation, getById, getByToken, listInvitations, markOpened, submitRsvp, toGuest, updateInvitation } from '../../server/core/invitations'
import { freshDb, invite, SECRET, tokenOf } from './helpers'

const newCampaign = (db: ReturnType<typeof freshDb>, slug = 'dana-and-omer') =>
  createCampaign(db, { slug, couple: { en: { first: 'Dana', second: 'Omer' }, he: { first: 'דנה', second: 'עומר' } } })

describe('migration to campaigns', () => {
  it('a fresh database starts with the Victor and Dani campaign, live', () => {
    const [first, ...rest] = listCampaigns(freshDb())
    expect(rest).toEqual([])
    expect(first).toMatchObject({ id: 1, slug: 'victor-and-dani', status: 'live', password_hash: null })
    expect(contentOf(first!).couple.en).toEqual({ first: 'Victor', second: 'Dani' })
    expect(designOf(first!)).toMatchObject({ theme: 'nocturne', options: { backdrop: 'stars' } })
  })

  it('brings a design saved with a fixed palette up to date, keeping the owner\'s CSS', () => {
    const db = freshDb()
    db.exec('DROP TABLE design_versions')
    db.prepare('UPDATE campaigns SET design = ? WHERE id = 1').run(JSON.stringify({ theme: 'nocturne', options: { emblem: 'wreath', palette: 'bone', backdrop: 'damask', gate: 'gate' }, customCss: '.hero{}' }))
    db.pragma('user_version = 6')
    migrate(db)
    expect(JSON.parse(getCampaign(db, 1).design)).toEqual({ version: 2, theme: 'nocturne', preset: 'nocturne-bone', colours: PRESETS['nocturne-bone']!.colours, lettering: DEFAULT_LETTERING, options: { emblem: 'wreath', backdrop: 'damask', gate: 'gate' }, customCss: '.hero{}' })
    expect(listDesignVersions(db, 1)).toEqual([])
  })

  it('moves invitations, RSVPs and WhatsApp wording from the single-site database into campaign 1', () => {
    const db = new Database(':memory:')
    // The schema exactly as version 1 shipped it.
    db.exec(`
      CREATE TABLE invitations (id INTEGER PRIMARY KEY, guest_name TEXT NOT NULL, language TEXT NOT NULL DEFAULT 'he', token_hash TEXT NOT NULL UNIQUE,
        token_nonce TEXT NOT NULL, revoked_at TEXT, guests_allowed INTEGER NOT NULL DEFAULT 0, rsvp_status TEXT NOT NULL DEFAULT 'pending',
        extra_guests TEXT NOT NULL DEFAULT '[]', dietary_notes TEXT NOT NULL DEFAULT '', message TEXT NOT NULL DEFAULT '', sent_at TEXT, responded_at TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE admin_sessions (token_hash TEXT PRIMARY KEY, expires_at TEXT NOT NULL);
      CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      INSERT INTO invitations (guest_name, token_hash, token_nonce, guests_allowed, rsvp_status, extra_guests, created_at, updated_at)
        VALUES ('דניאל כהן', 'h1', 'n1', 1, 'attending', '["מאיה כהן"]', '2026-01-01', '2026-01-01'), ('Alex Levi', 'h2', 'n2', 0, 'pending', '[]', '2026-01-01', '2026-01-01');
      INSERT INTO settings VALUES ('whatsapp_templates', '{"he":"היי {name} {link}","en":"Hey {name} {link}"}');
      PRAGMA user_version = 1;
    `)
    migrate(db)
    const rows = listInvitations(db, 1)
    expect(rows.map(r => [r.guest_name, r.campaign_id, r.rsvp_status, r.extra_guests])).toEqual([['Alex Levi', 1, 'pending', '[]'], ['דניאל כהן', 1, 'attending', '["מאיה כהן"]']])
    expect(JSON.parse(getCampaign(db, 1).whatsapp).he).toBe('היי {name} {link}')
    expect(db.pragma('user_version', { simple: true })).toBe(freshDb().pragma('user_version', { simple: true })) // fully migrated
    expect(rows.every(r => r.guests_allowed === 1)).toBe(true) // migration 3: everyone may bring guests
  })
})

describe('creating campaigns', () => {
  it('starts as a draft with the default design and no couple login', () => {
    const row = newCampaign(freshDb())
    expect(row).toMatchObject({ slug: 'dana-and-omer', status: 'draft', password_hash: null })
    expect(contentOf(row).couple.he.first).toBe('דנה')
    expect(designOf(row).theme).toBe('nocturne')
  })

  it('accepts only DNS-safe, unreserved, unused addresses', () => {
    const db = freshDb()
    for (const bad of ['', 'ab', 'Has Space', '-lead', 'trail-', 'double--hyphen', 'עברית', 'a'.repeat(41), 'admin', 'www', 'a.b', '../x']) {
      expect(() => validateSlug(bad), bad).toThrow(ValidationError)
    }
    expect(validateSlug('  Dana-And-Omer2 ')).toBe('dana-and-omer2')
    newCampaign(db)
    expect(() => newCampaign(db)).toThrow(/already used/)
    expect(() => newCampaign(db, 'victor-and-dani')).toThrow(/already used/)
  })
})

describe('campaign isolation', () => {
  it('lists, reads, edits and deletes only within the campaign', () => {
    const db = freshDb()
    const other = newCampaign(db)
    const mine = invite(db, 'Mine', true, 1)
    const theirs = invite(db, 'Theirs', true, other.id)

    expect(listInvitations(db, 1).map(r => r.guest_name)).toEqual(['Mine'])
    expect(listInvitations(db, other.id).map(r => r.guest_name)).toEqual(['Theirs'])
    // Reaching across with a real id from the other campaign is "not found", never a silent success.
    expect(() => getById(db, 1, theirs.id)).toThrow(NotFoundError)
    expect(() => updateInvitation(db, 1, theirs.id, { guestName: 'Hijacked' })).toThrow(NotFoundError)
    expect(() => deleteInvitation(db, other.id, mine.id)).toThrow(NotFoundError)
    expect(getById(db, other.id, theirs.id).guest_name).toBe('Theirs')
  })

  it('imports into one campaign and warns only about that campaign\'s names', () => {
    const db = freshDb()
    const other = newCampaign(db)
    invite(db, 'Shared Name', false, 1)
    const existing = listInvitations(db, other.id).map(r => r.guest_name)
    expect(buildPreview('name\nShared Name\n', existing).rows[0]!.warnings).toEqual([])
    commitImport(db, SECRET, other.id, 'name\nShared Name\n')
    expect(listInvitations(db, 1)).toHaveLength(1)
    expect(listInvitations(db, other.id)).toHaveLength(1)
  })

  it('deleting a campaign removes its guests and sessions and nothing else', () => {
    const db = freshDb()
    const other = newCampaign(db)
    const kept = invite(db, 'Kept', false, 1)
    const gone = invite(db, 'Gone', false, other.id)
    const session = createSession(db, other.id).token
    deleteCampaign(db, other.id)
    expect(getCampaignBySlug(db, 'dana-and-omer')).toBeNull()
    expect(getByToken(db, tokenOf(gone))).toBeNull()
    expect(getSession(db, session)).toBeNull()
    expect(getByToken(db, tokenOf(kept))).not.toBeNull()
  })
})

describe('campaign status and replies', () => {
  it('accepts replies only while live', () => {
    const db = freshDb()
    const draft = newCampaign(db)
    const token = tokenOf(invite(db, 'Guest', false, draft.id))
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending' })).toThrow(/not accepting replies/)
    setStatus(db, draft.id, 'live')
    expect(submitRsvp(db, token, { rsvpStatus: 'attending' }).rsvp_status).toBe('attending')
    setStatus(db, draft.id, 'archived')
    expect(() => submitRsvp(db, token, { rsvpStatus: 'declined' })).toThrow(ValidationError)
    expect(() => setStatus(db, draft.id, 'paused')).toThrow(ValidationError)
  })

  it('closes replies by hand or after the reply-by date, in Israel time', () => {
    const c = defaultContent()
    expect(rsvpClosed(c)).toBe(false)
    expect(rsvpClosed({ ...c, rsvp: { ...c.rsvp, closed: true } })).toBe(true)
    const dated = { ...c, rsvpBy: '2027-04-20', rsvp: { ...c.rsvp, closeAfterDeadline: true } }
    expect(rsvpClosed(dated, new Date('2027-04-20T20:30:00Z'))).toBe(false) // still the 20th in Israel
    expect(rsvpClosed(dated, new Date('2027-04-20T21:30:00Z'))).toBe(true) // 00:30 on the 21st in Israel
    expect(rsvpClosed({ ...dated, rsvp: { ...dated.rsvp, closeAfterDeadline: false } }, new Date('2028-01-01T00:00:00Z'))).toBe(false)

    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest'))
    setContent(db, 1, { ...contentOf(getCampaign(db, 1)), rsvp: { ...c.rsvp, closed: true } })
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending' })).toThrow(/Replies are closed/)
  })

  it('records the first time a link is opened, once', () => {
    const db = freshDb()
    const row = invite(db, 'Guest')
    markOpened(db, row)
    const first = getById(db, 1, row.id).first_opened_at
    expect(first).not.toBeNull()
    markOpened(db, getById(db, 1, row.id))
    expect(getById(db, 1, row.id).first_opened_at).toBe(first)
  })
})

describe('guest limits', () => {
  const withLimit = (db: ReturnType<typeof freshDb>, guestLimit: number) =>
    setContent(db, 1, { ...contentOf(getCampaign(db, 1)), rsvp: { ...defaultContent().rsvp, guestLimit } })

  it('applies the campaign limit, and a plus-one campaign allows exactly one', () => {
    const db = freshDb()
    withLimit(db, 1)
    const row = invite(db, 'Guest', true)
    expect(toGuest(row, 1).guestLimit).toBe(1)
    expect(() => submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['A', 'B'] })).toThrow(/At most 1 additional guest can/)
    expect(submitRsvp(db, tokenOf(row), { rsvpStatus: 'attending', extraGuests: ['A'] }).extra_guests).toBe('["A"]')
  })

  it('an invitee\'s own limit overrides the campaign\'s', () => {
    const db = freshDb()
    withLimit(db, 1)
    const family = updateInvitation(db, 1, invite(db, 'Family', true).id, { guestLimit: 4 })
    expect(toGuest(family, 1).guestLimit).toBe(4)
    expect(submitRsvp(db, tokenOf(family), { rsvpStatus: 'attending', extraGuests: ['A', 'B', 'C', 'D'] }).rsvp_status).toBe('attending')
    expect(() => submitRsvp(db, tokenOf(family), { rsvpStatus: 'attending', extraGuests: ['A', 'B', 'C', 'D', 'E'] })).toThrow(/At most 4/)
    expect(() => updateInvitation(db, 1, family.id, { guestLimit: 99 })).toThrow(ValidationError)
    expect(() => updateInvitation(db, 1, family.id, { guestLimit: -1 })).toThrow(ValidationError)
    expect(updateInvitation(db, 1, family.id, { guestLimit: '' }).guest_limit).toBeNull()
    expect(toGuest(invite(db, 'No guests', false), 5).guestLimit).toBe(0)
  })

  it('everyone may bring guests by default; an own limit of 0 means they come alone', () => {
    const db = freshDb()
    const byDefault = createInvitation(db, SECRET, 1, { guestName: 'Default' })
    expect(byDefault.guests_allowed).toBe(1)
    const alone = createInvitation(db, SECRET, 1, { guestName: 'Alone', guestLimit: 0 })
    expect([alone.guests_allowed, alone.guest_limit]).toEqual([0, null])
    expect(() => submitRsvp(db, tokenOf(alone), { rsvpStatus: 'attending', extraGuests: ['A'] })).toThrow(/does not include/)
    // Setting 0 later removes guests already named; clearing the limit allows them again.
    submitRsvp(db, tokenOf(byDefault), { rsvpStatus: 'attending', extraGuests: ['A'] })
    const restricted = updateInvitation(db, 1, byDefault.id, { guestLimit: 0 })
    expect([restricted.guests_allowed, restricted.extra_guests]).toEqual([0, '[]'])
    expect(updateInvitation(db, 1, byDefault.id, { guestLimit: '' }).guests_allowed).toBe(1)
  })

  it('lowering a limit keeps names already given but lets no more be added', () => {
    const db = freshDb()
    const row = invite(db, 'Guest', true)
    const token = tokenOf(row)
    submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A', 'B', 'C'] })
    withLimit(db, 1)
    expect(submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A', 'B', 'C'], message: 'see you' }).extra_guests).toBe('["A","B","C"]')
    expect(() => submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['A', 'B', 'C', 'D'] })).toThrow(/At most 3/)
  })

  it('ignores notes the campaign does not ask for', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest'))
    setContent(db, 1, { ...contentOf(getCampaign(db, 1)), rsvp: { ...defaultContent().rsvp, askDietary: false, askMessage: false } })
    const saved = submitRsvp(db, token, { rsvpStatus: 'attending', dietaryNotes: 'x'.repeat(5000), message: 'hidden' })
    expect([saved.dietary_notes, saved.message]).toEqual(['', ''])
  })
})

describe('campaign content', () => {
  it('keeps valid details and drops unknown keys', () => {
    const c = validateContent({ ...defaultContent(), date: '2027-05-20', ceremonyTime: '', couple: { he: { first: ' דנה ', second: 'עומר' }, en: { first: 'Dana', second: 'Omer' } }, evil: 'x' })
    expect(c.couple.he.first).toBe('דנה')
    expect(c.ceremonyTime).toBe('')
    expect(c).not.toHaveProperty('evil')
  })

  it('rejects bad dates, times, limits and languages', () => {
    const base = defaultContent()
    for (const bad of [{ date: '20/05/2027' }, { date: '2027-13-40' }, { receptionTime: '7pm' }, { ceremonyTime: '25:00' }, { languages: [] }, { languages: ['fr'] }, { rsvp: { ...base.rsvp, guestLimit: 0 } }, { rsvp: { ...base.rsvp, guestLimit: 21 } }]) {
      expect(() => validateContent({ ...base, ...bad }), JSON.stringify(bad)).toThrow(ValidationError)
    }
    expect(() => validateContent({ ...base, couple: { he: { first: 'x'.repeat(41), second: '' }, en: base.couple.en } })).toThrow(/limited to 40/)
  })

  it('accepts only http(s) links, so a saved link can never run script', () => {
    const base = defaultContent()
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>', 'waze.com/ul', 'vbscript:x', ' JaVaScRiPt:alert(1)']) {
      expect(() => validateContent({ ...base, links: { waze: bad, googleMaps: '' } }), bad).toThrow(/link/)
    }
    expect(validateContent({ ...base, links: { waze: 'https://waze.com/ul?q=x', googleMaps: '' } }).links.waze).toBe('https://waze.com/ul?q=x')
  })

  it('validates WhatsApp wording and requires the link placeholder', () => {
    const db = freshDb()
    expect(() => setWhatsapp(db, 1, { he: 'בלי קישור', en: 'Hi {link}' })).toThrow(/\{link\}/)
    expect(JSON.parse(setWhatsapp(db, 1, { he: 'היי {link}', en: 'Hi {link}' }).whatsapp).he).toBe('היי {link}')
  })
})

describe('Russian', () => {
  it('is a language for campaigns, invitations and imports, and old campaigns gain its empty fields', () => {
    const db = freshDb()
    // Campaign 1 was stored before Russian existed in some databases: reading it must still give every language.
    db.prepare('UPDATE campaigns SET content = ? WHERE id = 1').run(JSON.stringify({ couple: { he: { first: 'א', second: 'ב' }, en: { first: 'A', second: 'B' } }, languages: ['he', 'en'] }))
    const old = contentOf(getCampaign(db, 1))
    expect(old.couple.ru).toEqual({ first: '', second: '' })
    expect(old.copy.ru).toEqual({ invite: '', intro: '', footer: '' })

    const saved = contentOf(setContent(db, 1, { ...old, languages: ['ru', 'he'], couple: { ...old.couple, ru: { first: 'Виктор', second: 'Дани' } } }))
    expect(saved.languages).toEqual(['ru', 'he'])
    expect(saved.couple.ru.first).toBe('Виктор')

    expect(createInvitation(db, SECRET, 1, { guestName: 'Анна Петрова', language: 'ru' }).language).toBe('ru')
    const preview = buildPreview('name,language\nАнна Петрова,ru\nBad,de\n', [])
    expect(preview.rows[0]).toMatchObject({ name: 'Анна Петрова', language: 'ru', errors: [] })
    expect(preview.rows[1]!.errors[0]).toMatch(/he, en or ru/)
    expect(JSON.parse(setWhatsapp(db, 1, { he: 'היי {link}', en: 'Hi {link}' }).whatsapp).ru).toContain('{link}')
  })
})

describe('design', () => {
  const gold = PRESETS['nocturne-gold']!.colours

  it('keeps known choices and falls back to defaults for anything else', () => {
    const d = normaliseDesign({ theme: 'nocturne', options: { emblem: 'wreath', backdrop: 'neon', made: 'up' } }, 'any')
    expect(d).toEqual({ version: 2, theme: 'nocturne', preset: 'nocturne-gold', colours: gold, lettering: DEFAULT_LETTERING, options: { emblem: 'wreath', backdrop: 'stars', gate: 'gate' }, customCss: '' })
    expect(normaliseDesign({ theme: 'no-such-theme' }, 'any').theme).toBe('nocturne')
    expect(normaliseDesign({ preset: 'no-such-preset' }, 'any').preset).toBe('nocturne-gold')
  })

  it('accepts only plain hex colours, and anything else keeps the colour it replaces', () => {
    const d = normaliseDesign({ colours: { ground: '#ABC', text: 'red', accent: 'url(javascript:alert(1))', accent2: '#12345', muted: '#b7ad9c;x:y', surface: null } }, 'any')
    expect(d.colours).toEqual({ ...gold, ground: '#aabbcc' })
    const custom = normaliseDesign({ colours: { accent: '#ff00aa' } }, 'any')
    // A later save that sends no colours keeps the couple's own ones.
    expect(normaliseDesign({ options: { emblem: 'moon' } }, 'any', custom).colours.accent).toBe('#ff00aa')
    // Choosing another preset starts from that preset's colours.
    expect(normaliseDesign({ preset: 'nocturne-bone' }, 'any', custom).colours).toEqual(PRESETS['nocturne-bone']!.colours)
  })

  it('reads designs saved before colours were free', () => {
    const old = readDesign({ theme: 'nocturne', options: { emblem: 'moon', palette: 'oxblood', backdrop: 'spires', gate: 'plain' }, customCss: '.x{}' }, 'any')
    expect(old).toEqual({ version: 2, theme: 'nocturne', preset: 'nocturne-oxblood', colours: PRESETS['nocturne-oxblood']!.colours, lettering: DEFAULT_LETTERING, options: { emblem: 'moon', backdrop: 'spires', gate: 'plain' }, customCss: '.x{}' })
    expect(readDesign('not a design', 'any').preset).toBe('nocturne-gold')
  })

  it('every preset is readable, and an untouched preset keeps its hand-tuned shades', () => {
    for (const [id, preset] of Object.entries(PRESETS)) expect(colourProblems(preset.colours), id).toEqual([])
    const tokens = designTokens({ preset: 'nocturne-bone', colours: PRESETS['nocturne-bone']!.colours })
    expect(tokens).toMatchObject({ accentDim: '#8a857c', star: '#f1ece2', glow: '#1b1a1c', scheme: 'dark' })
    // Change one colour and the rest is worked out afresh.
    expect(designTokens({ preset: 'nocturne-bone', colours: { ...PRESETS['nocturne-bone']!.colours, accent: '#c9a961' } }).accentDim).not.toBe('#8a857c')
    expect(designTokens({ preset: 'nocturne-ivory', colours: PRESETS['nocturne-ivory']!.colours }).scheme).toBe('light')
    expect(tokenVars(tokens)['--color-gold']).toBe('#f1ece2')
  })

  it('measures contrast and repairs an unreadable palette', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21)
    expect(contrast('#777777', '#777777')).toBe(1)
    const bad = { ...gold, text: '#1a1a1a', muted: '#222222' }
    expect(colourProblems(bad).map(p => p.role)).toEqual(['text', 'muted', 'text'])
    expect(colourProblems(fixColours(bad))).toEqual([])
    // A dark background under a light preset: the panels follow the background rather than fighting the text.
    const flipped = { ...PRESETS['nocturne-ivory']!.colours, ground: '#2a2320' }
    expect(colourProblems(fixColours(flipped))).toEqual([])
    for (const hex of ['#000000', '#ffffff', '#808080', '#ff0000']) expect(colourProblems(fixColours({ ground: hex, surface: hex, text: hex, muted: hex, accent: hex, accent2: hex }))).toEqual([])
    // Colours that were fine are left exactly as they were.
    expect(fixColours(gold)).toEqual(gold)
  })

  it('lets a couple choose a typeface per role, only from faces that can draw what the role needs', () => {
    expect(normaliseLettering({ display: 'rubik', latin: 'great-vibes', body: 'great-vibes', numeral: 'no-such-font' })).toEqual({ display: 'rubik', latin: 'great-vibes', body: 'david', numeral: 'pirata' })
    // A Latin-only face can never be the Hebrew display face.
    expect(normaliseLettering({ display: 'playfair' }).display).toBe('frank-ruhl')
    for (const role of Object.keys(FONT_ROLES) as FontRole[]) {
      expect(Object.keys(fontsForRole(role)), role).toContain(DEFAULT_LETTERING[role])
      for (const font of Object.values(fontsForRole(role))) expect(font.scripts).toContain(FONT_ROLES[role].needs)
    }
    // Defaults add nothing to the page; a chosen face goes in front of the theme's own stack.
    expect(letteringVars(DEFAULT_LETTERING)).toEqual({})
    expect(letteringVars({ ...DEFAULT_LETTERING, display: 'rubik' })).toEqual({ '--font-display': expect.stringMatching(/^'Rubik Variable', 'Frank Ruhl Libre Variable'/) })
    expect(fontsInUse({ display: 'rubik', latin: 'rubik', body: 'david', numeral: 'pirata' })).toEqual(['rubik', 'david', 'pirata'])
    for (const font of Object.values(FONTS)) expect(font.family).not.toMatch(/['";]/)
    // Saved with the design, and kept by a later save that does not mention it.
    const db = freshDb()
    setDesign(db, 1, { lettering: { display: 'suez', latin: 'cormorant' } }, false)
    expect(designOf(setDesign(db, 1, { options: { emblem: 'moon' } }, false)).lettering).toEqual({ ...DEFAULT_LETTERING, display: 'suez', latin: 'cormorant' })
  })

  it('refuses a design guests could not read', () => {
    const db = freshDb()
    expect(() => setDesign(db, 1, { colours: { text: '#0b090c' } }, false)).toThrow(/hard to read/)
    expect(designOf(getCampaign(db, 1)).colours).toEqual(gold)
  })

  it('lets only the owner set custom CSS, and never lets it close its style element', () => {
    const db = freshDb()
    const byCouple = setDesign(db, 1, { theme: 'nocturne', preset: 'nocturne-bone', customCss: 'body{display:none}' }, false)
    expect(designOf(byCouple)).toMatchObject({ preset: 'nocturne-bone', customCss: '' })
    const byOwner = setDesign(db, 1, { theme: 'nocturne', options: {}, customCss: '.x{color:red}</style><script>alert(1)</script>' }, true)
    expect(designOf(byOwner).customCss).not.toMatch(/<\/?style/i)
    // A couple saving the design later keeps the owner's CSS.
    expect(designOf(setDesign(db, 1, { theme: 'nocturne', options: { emblem: 'moon' } }, false)).customCss).toBe(designOf(byOwner).customCss)
  })

  it('keeps earlier designs and brings one back', () => {
    const db = freshDb()
    setDesign(db, 1, { preset: 'nocturne-bone' }, false)
    setDesign(db, 1, { preset: 'nocturne-bone' }, false) // nothing changed: no new history entry
    setDesign(db, 1, { colours: { accent: '#ff99cc' } }, false)
    const versions = listDesignVersions(db, 1)
    expect(versions.map(v => v.design.preset)).toEqual(['nocturne-bone', 'nocturne-gold'])
    expect(designOf(restoreDesignVersion(db, 1, versions[1]!.id)).colours).toEqual(gold)
    expect(listDesignVersions(db, 1)).toHaveLength(3)
    expect(() => restoreDesignVersion(db, 1, 9999)).toThrow(/no longer exists/)
    for (let i = 0; i < 15; i++) setDesign(db, 1, { options: { emblem: i % 2 ? 'moon' : 'wreath' } }, false)
    expect(listDesignVersions(db, 1)).toHaveLength(DESIGN_VERSIONS_KEPT)
    // Another campaign never sees this history.
    const other = createCampaign(db, { slug: 'dana-and-omer' })
    expect(listDesignVersions(db, other.id)).toEqual([])
    deleteCampaign(db, 1)
    expect(db.prepare('SELECT count(*) AS n FROM design_versions').get()).toEqual({ n: 0 })
  })
})

describe('couple access', () => {
  it('a new password signs the couple out everywhere and replaces the old one', () => {
    const db = freshDb()
    const campaign = newCampaign(db)
    setPassword(db, campaign.id, 'first-password-123')
    const session = createSession(db, campaign.id).token
    const owner = createSession(db).token
    setPassword(db, campaign.id, 'second-password-456')
    const hash = getCampaign(db, campaign.id).password_hash!
    expect([verifyPassword('first-password-123', hash), verifyPassword('second-password-456', hash)]).toEqual([false, true])
    expect(getSession(db, session)).toBeNull()
    expect(getSession(db, owner)).not.toBeNull()
    expect(() => setPassword(db, campaign.id, 'short')).toThrow(ValidationError)
  })

  it('changing the address keeps every link working', () => {
    const db = freshDb()
    const token = tokenOf(invite(db, 'Guest'))
    expect(setSlug(db, 1, 'vic-and-dani').slug).toBe('vic-and-dani')
    expect(getByToken(db, token)).not.toBeNull()
    newCampaign(db)
    expect(() => setSlug(db, 1, 'dana-and-omer')).toThrow(/already used/)
  })
})
