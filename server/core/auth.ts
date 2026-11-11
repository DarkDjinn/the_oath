import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { DB } from './db'

const SESSION_DAYS = 14

/** Stored form: `scrypt:<salt base64url>:<hash base64url>`. No `$`, so it survives .env and Compose interpolation. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  return `scrypt:${salt.toString('base64url')}:${scryptSync(password, salt, 64).toString('base64url')}`
}

export function verifyPassword(password: unknown, stored: string | undefined): boolean {
  if (typeof password !== 'string' || !password || password.length > 1024 || !stored) return false
  const [scheme, salt, hash] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

const sha = (v: string) => createHash('sha256').update(v).digest('hex')

export interface Session { role: 'owner' | 'couple', campaignId: number | null }

/** Sessions live in SQLite (hashed), so logging out really ends them. `campaignId` null is the owner. */
export function createSession(db: DB, campaignId: number | null = null): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url')
  const maxAge = SESSION_DAYS * 86400
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(new Date().toISOString())
  db.prepare('INSERT INTO admin_sessions (token_hash, expires_at, campaign_id) VALUES (?, ?, ?)').run(sha(token), new Date(Date.now() + maxAge * 1000).toISOString(), campaignId)
  return { token, maxAge }
}

export function getSession(db: DB, token: unknown): Session | null {
  if (typeof token !== 'string' || !token) return null
  const row = db.prepare('SELECT expires_at, campaign_id FROM admin_sessions WHERE token_hash = ?').get(sha(token)) as { expires_at: string, campaign_id: number | null } | undefined
  if (!row || row.expires_at <= new Date().toISOString()) return null
  return row.campaign_id === null ? { role: 'owner', campaignId: null } : { role: 'couple', campaignId: row.campaign_id }
}

export const isValidSession = (db: DB, token: unknown): boolean => getSession(db, token) !== null

/** May this session act on this campaign? The owner may act on all; a couple only on their own. */
export function canAccess(session: Session | null, campaignId: number): boolean {
  return !!session && (session.role === 'owner' || session.campaignId === campaignId)
}

export function deleteSession(db: DB, token: unknown): void {
  if (typeof token === 'string' && token) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(sha(token))
}
