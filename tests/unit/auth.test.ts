import { describe, expect, it } from 'vitest'
import { canAccess, createSession, deleteSession, getSession, hashPassword, isValidSession, verifyPassword } from '../../server/core/auth'
import { createRateLimiter } from '../../server/core/rateLimit'
import { freshDb } from './helpers'

describe('admin password', () => {
  it('verifies the right password and rejects everything else', () => {
    const stored = hashPassword('correct horse battery')
    expect(stored).toMatch(/^scrypt:[\w-]+:[\w-]+$/)
    expect(stored).not.toContain('correct horse')
    expect(verifyPassword('correct horse battery', stored)).toBe(true)
    for (const bad of ['wrong', '', null, undefined, 42, 'correct horse battery ']) expect(verifyPassword(bad, stored)).toBe(false)
    expect(verifyPassword('anything', undefined)).toBe(false)
    expect(verifyPassword('anything', 'plaintext')).toBe(false)
  })
})

describe('admin sessions', () => {
  it('are random, stored hashed, expire, and end on logout', () => {
    const db = freshDb()
    const a = createSession(db), b = createSession(db)
    expect(a.token).not.toBe(b.token)
    expect(isValidSession(db, a.token)).toBe(true)
    expect(JSON.stringify(db.prepare('SELECT * FROM admin_sessions').all())).not.toContain(a.token)
    for (const bad of ['', 'guess', null, undefined]) expect(isValidSession(db, bad)).toBe(false)

    deleteSession(db, a.token)
    expect(isValidSession(db, a.token)).toBe(false)
    db.prepare('UPDATE admin_sessions SET expires_at = ?').run('2000-01-01T00:00:00.000Z')
    expect(isValidSession(db, b.token)).toBe(false)
  })
})

describe('roles', () => {
  it('an owner session reaches every campaign, a couple session only its own', () => {
    const db = freshDb()
    const owner = getSession(db, createSession(db).token)
    const couple = getSession(db, createSession(db, 7).token)
    expect(owner).toEqual({ role: 'owner', campaignId: null })
    expect(couple).toEqual({ role: 'couple', campaignId: 7 })
    expect([canAccess(owner, 1), canAccess(owner, 7)]).toEqual([true, true])
    expect([canAccess(couple, 7), canAccess(couple, 1), canAccess(null, 7)]).toEqual([true, false, false])
  })
})

describe('rate limiter', () => {
  it('allows up to the limit per key and resets after the window', () => {
    const limiter = createRateLimiter({ windowMs: 1000, max: 3 })
    expect([1, 2, 3, 4].map(() => limiter.hit('ip', 0).allowed)).toEqual([true, true, true, false])
    expect(limiter.hit('other', 0).allowed).toBe(true)
    expect(limiter.hit('ip', 500).retryAfter).toBe(1)
    expect(limiter.hit('ip', 1001).allowed).toBe(true)
  })
})
