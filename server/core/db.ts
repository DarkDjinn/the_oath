import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import Database from 'better-sqlite3'

export type DB = Database.Database

/**
 * Ordered migrations. `PRAGMA user_version` records how many have run.
 * Append new statements; never edit an entry that has shipped.
 */
const MIGRATIONS: string[] = [
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
]

export function migrate(db: DB): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]!)
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
