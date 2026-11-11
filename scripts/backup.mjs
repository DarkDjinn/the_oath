#!/usr/bin/env node
// Consistent online backup of the SQLite database (safe while the app is running).
//   node scripts/backup.mjs [destination-directory]
// Uses SQLite's backup API, so WAL contents are included; never copy the .db file by hand.
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import Database from 'better-sqlite3'

const source = process.env.DATABASE_PATH || './data/wedding.db'
const dir = process.argv[2] || process.env.BACKUP_DIR || './data/backups'
mkdirSync(dir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const target = join(dir, `wedding-${stamp}.db`)

const db = new Database(source, { readonly: true, fileMustExist: true })
await db.backup(target)
db.close()

const check = new Database(target, { readonly: true })
const ok = check.pragma('integrity_check', { simple: true })
const count = check.prepare('SELECT count(*) AS n FROM invitations').get().n
check.close()
if (ok !== 'ok') { console.error(`Backup written but failed its integrity check: ${ok}`); process.exit(1) }
console.log(`Backup written: ${target} (${count} invitations, integrity ok)`)
