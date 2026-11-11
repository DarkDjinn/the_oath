import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'
import { DEFAULT_WHATSAPP, defaultContent, type CampaignContent } from '../../shared/campaign'
import { THEMES } from '../../shared/themes'

export type DB = Database.Database

/**
 * Ordered migrations. `PRAGMA user_version` records how many have run.
 * Append new statements; never edit an entry that has shipped.
 */
type Migration = string | ((db: DB) => void)

const MIGRATIONS: Migration[] = [
  `
  CREATE TABLE invitations (
    id             INTEGER PRIMARY KEY,
    guest_name     TEXT NOT NULL,
    language       TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en')),
    token_hash     TEXT NOT NULL UNIQUE,
    token_nonce    TEXT NOT NULL,
    revoked_at     TEXT,
    guests_allowed INTEGER NOT NULL DEFAULT 0 CHECK (guests_allowed IN (0, 1)),
    rsvp_status    TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
    extra_guests   TEXT NOT NULL DEFAULT '[]',
    dietary_notes  TEXT NOT NULL DEFAULT '',
    message        TEXT NOT NULL DEFAULT '',
    sent_at        TEXT,
    responded_at   TEXT,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );
  CREATE INDEX invitations_status ON invitations (rsvp_status);

  CREATE TABLE admin_sessions (
    token_hash TEXT PRIMARY KEY,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,

  // 2: the site becomes a platform. Everything that existed moves into campaign 1, "Victor and Dani".
  (db) => {
    db.exec(`
      CREATE TABLE campaigns (
        id            INTEGER PRIMARY KEY,
        slug          TEXT NOT NULL UNIQUE,
        status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
        password_hash TEXT,
        design        TEXT NOT NULL,
        content       TEXT NOT NULL,
        whatsapp      TEXT NOT NULL,
        created_at    TEXT NOT NULL,
        updated_at    TEXT NOT NULL
      );
      ALTER TABLE invitations ADD COLUMN campaign_id INTEGER NOT NULL DEFAULT 1;
      ALTER TABLE invitations ADD COLUMN guest_limit INTEGER;
      ALTER TABLE invitations ADD COLUMN first_opened_at TEXT;
      CREATE INDEX invitations_campaign ON invitations (campaign_id);
      ALTER TABLE admin_sessions ADD COLUMN campaign_id INTEGER;
    `)
    const old = db.prepare('SELECT value FROM settings WHERE key = ?').get('whatsapp_templates') as { value: string } | undefined
    let whatsapp = DEFAULT_WHATSAPP
    try { if (old) whatsapp = { ...DEFAULT_WHATSAPP, ...JSON.parse(old.value) } }
    catch { /* keep defaults */ }
    const now = new Date().toISOString()
    db.prepare('INSERT INTO campaigns (id, slug, status, design, content, whatsapp, created_at, updated_at) VALUES (1, ?, ?, ?, ?, ?, ?, ?)').run(
      'victor-and-dani', 'live',
      JSON.stringify({ theme: 'nocturne', options: THEMES.nocturne!.defaults, customCss: '' }),
      JSON.stringify(FIRST_CAMPAIGN), JSON.stringify(whatsapp), now, now,
    )
    db.exec('DROP TABLE settings')
  },

  // 3: every invitee may bring guests unless their own limit is set to 0.
  'UPDATE invitations SET guests_allowed = 1 WHERE guests_allowed = 0',

  // 4: Russian. SQLite cannot alter a CHECK constraint, so the table is rebuilt with the wider one.
  `
  CREATE TABLE invitations_new (
    id              INTEGER PRIMARY KEY,
    campaign_id     INTEGER NOT NULL DEFAULT 1,
    guest_name      TEXT NOT NULL,
    language        TEXT NOT NULL DEFAULT 'he' CHECK (language IN ('he', 'en', 'ru')),
    token_hash      TEXT NOT NULL UNIQUE,
    token_nonce     TEXT NOT NULL,
    revoked_at      TEXT,
    guests_allowed  INTEGER NOT NULL DEFAULT 1 CHECK (guests_allowed IN (0, 1)),
    guest_limit     INTEGER,
    rsvp_status     TEXT NOT NULL DEFAULT 'pending' CHECK (rsvp_status IN ('pending', 'attending', 'declined')),
    extra_guests    TEXT NOT NULL DEFAULT '[]',
    dietary_notes   TEXT NOT NULL DEFAULT '',
    message         TEXT NOT NULL DEFAULT '',
    sent_at         TEXT,
    first_opened_at TEXT,
    responded_at    TEXT,
    created_at      TEXT NOT NULL,
    updated_at      TEXT NOT NULL
  );
  INSERT INTO invitations_new (id, campaign_id, guest_name, language, token_hash, token_nonce, revoked_at, guests_allowed, guest_limit,
                               rsvp_status, extra_guests, dietary_notes, message, sent_at, first_opened_at, responded_at, created_at, updated_at)
    SELECT id, campaign_id, guest_name, language, token_hash, token_nonce, revoked_at, guests_allowed, guest_limit,
           rsvp_status, extra_guests, dietary_notes, message, sent_at, first_opened_at, responded_at, created_at, updated_at FROM invitations;
  DROP TABLE invitations;
  ALTER TABLE invitations_new RENAME TO invitations;
  CREATE INDEX invitations_status ON invitations (rsvp_status);
  CREATE INDEX invitations_campaign ON invitations (campaign_id);
  `,
]

/** The event details the site had before campaigns existed. Date and venue are still placeholders. */
const FIRST_CAMPAIGN: CampaignContent = {
  ...defaultContent(),
  couple: { he: { first: 'ויקטור', second: 'דני' }, en: { first: 'Victor', second: 'Dani' }, ru: { first: '', second: '' } },
  date: '2027-05-20',
  venue: { he: { name: 'שם המקום', address: 'רחוב לדוגמה 1, עיר' }, en: { name: 'Venue Name', address: '1 Example Street, City' }, ru: { name: '', address: '' } },
  links: { googleMaps: 'https://maps.google.com/?q=Venue+Name', waze: 'https://waze.com/ul?q=Venue%20Name&navigate=yes' },
  dressCode: { he: 'לבוש ערב. שחור תמיד מתקבל בברכה.', en: 'Evening attire. Black is always welcome.', ru: '' },
  rsvpBy: '2027-04-20',
}

export function migrate(db: DB): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let v = current; v < MIGRATIONS.length; v++) {
    const step = MIGRATIONS[v]!
    db.transaction(() => {
      if (typeof step === 'string') db.exec(step)
      else step(db)
      db.pragma(`user_version = ${v + 1}`)
    })()
  }
}

export function openDatabase(path: string): DB {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true })
  const db = new Database(path)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.pragma('busy_timeout = 5000')
  migrate(db)
  return db
}
