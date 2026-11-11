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

/** Sessions live in SQLite (hashed), so logging out really ends them. Returns the cookie value. */
export function createSession(db: DB): { token: string; maxAge: number } {
  const token = randomBytes(32).toString('base64url')
  const maxAge = SESSION_DAYS * 86400
  db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(new Date().toISOString())
  db.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)').run(sha(token), new Date(Date.now() + maxAge * 1000).toISOString())
  return { token, maxAge }
}

export function isValidSession(db: DB, token: unknown): boolean {
  if (typeof token !== 'string' || !token) return false
  const row = db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').get(sha(token)) as { expires_at: string } | undefined
  return !!row && row.expires_at > new Date().toISOString()
}

export function deleteSession(db: DB, token: unknown): void {
  if (typeof token === 'string' && token) db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').run(sha(token))
}
