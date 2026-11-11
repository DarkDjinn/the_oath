/**
 * End-to-end checks against the production build.
 * Run `npm run build` first; the suite starts `.output/server/index.mjs` on a
 * spare port with a throwaway database.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashPassword } from '../../server/core/auth'
import { parseCsv } from '../../server/core/csv'

const PORT = 4300 + Math.floor(Math.random() * 500)
const ORIGIN = `http://127.0.0.1:${PORT}`
const PASSWORD = 'e2e-only-password-not-a-real-one'
const dir = mkdtempSync(join(tmpdir(), 'oath-e2e-'))
let server: ChildProcess
let cookie = ''

type Init = RequestInit & { json?: unknown, ip?: string }
function call(path: string, init: Init = {}) {
  const headers = new Headers(init.headers)
  if (init.json !== undefined) headers.set('content-type', 'application/json')
  if (init.ip) headers.set('x-forwarded-for', init.ip)
  if (init.method && init.method !== 'GET' && !headers.has('origin')) headers.set('origin', ORIGIN)
  return fetch(ORIGIN + path, { ...init, headers, body: init.json !== undefined ? JSON.stringify(init.json) : init.body, redirect: 'manual' })
}
const asAdmin = (path: string, init: Init = {}) => call(path, { ...init, headers: { ...init.headers, cookie } })
const tokenFrom = (url: string) => url.split('/i/')[1]!
const guest = (token: string, init: Init = {}) => call('/api/rsvp', { ...init, headers: { authorization: `Bearer ${token}` } })

beforeAll(async () => {
  if (!existsSync('.output/server/index.mjs')) throw new Error('Build first: npm run build')
  server = spawn('node', ['.output/server/index.mjs'], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      DATABASE_PATH: join(dir, 'wedding.db'),
      PHOTOS_DIR: join(dir, 'photos'),
      TOKEN_SECRET: 'e2e-token-secret-e2e-token-secret-0123456789',
      ADMIN_PASSWORD_HASH: hashPassword(PASSWORD),
      SITE_URL: 'https://wedding-example.duckdns.org',
      COOKIE_SECURE: 'false',
    },
    stdio: 'ignore',
  })
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${ORIGIN}/api/health`)).ok) break }
    catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 150))
  }
  const login = await call('/api/admin/login', { method: 'POST', json: { password: PASSWORD } })
  expect(login.status).toBe(200)
  const setCookie = login.headers.get('set-cookie')!
  expect(setCookie).toMatch(/HttpOnly/i)
  expect(setCookie).toMatch(/SameSite=Strict/i)
  cookie = setCookie.split(';')[0]!
})

afterAll(() => {
  server?.kill('SIGTERM')
  rmSync(dir, { recursive: true, force: true })
})

describe('admin access control', () => {
  const protectedRoutes: [string, string][] = [
    ['GET', '/api/admin/invitations'],
    ['POST', '/api/admin/invitations'],
    ['PATCH', '/api/admin/invitations/1'],
    ['DELETE', '/api/admin/invitations/1'],
    ['POST', '/api/admin/invitations/1/regenerate'],
    ['POST', '/api/admin/invitations/1/revoke'],
    ['POST', '/api/admin/import/preview'],
    ['POST', '/api/admin/import/commit'],
    ['GET', '/api/admin/csv/invitations.csv'],
    ['GET', '/api/admin/csv/planner.csv'],
    ['GET', '/api/admin/csv/template.csv'],
    ['GET', '/api/admin/settings'],
    ['PUT', '/api/admin/settings'],
  ]
  it.each(protectedRoutes)('%s %s requires a session', async (method, path) => {
    const anonymous = await call(path, { method, json: method === 'GET' ? undefined : {} })
    expect(anonymous.status).toBe(401)
    const forged = await call(path, { method, json: method === 'GET' ? undefined : {}, headers: { cookie: 'oath_admin=forged-session-value' } })
    expect(forged.status).toBe(401)
  })

  it('redirects the dashboard to sign-in and never renders guest data', async () => {
    const res = await call('/admin')
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/admin/login')
  })

  it('rejects a wrong password', async () => {
    const res = await call('/api/admin/login', { method: 'POST', json: { password: 'not-it' }, ip: '10.1.1.1' })
    expect(res.status).toBe(401)
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('refuses cross-origin writes even with a valid session', async () => {
    const res = await asAdmin('/api/admin/invitations', { method: 'POST', json: { guestName: 'CSRF' }, headers: { origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
  })

  it('locks out repeated sign-in failures from one address', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await call('/api/admin/login', { method: 'POST', json: { password: `guess-${i}` }, ip: '10.9.9.9' })).status)
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429])
    // Even the right password is refused while locked out.
    expect((await call('/api/admin/login', { method: 'POST', json: { password: PASSWORD }, ip: '10.9.9.9' })).status).toBe(429)
  })

  it('logging out ends the session on the server', async () => {
    const login = await call('/api/admin/login', { method: 'POST', json: { password: PASSWORD }, ip: '10.2.2.2' })
    const session = login.headers.get('set-cookie')!.split(';')[0]!
    expect((await call('/api/admin/invitations', { headers: { cookie: session } })).status).toBe(200)
    await call('/api/admin/logout', { method: 'POST', headers: { cookie: session } })
    expect((await call('/api/admin/invitations', { headers: { cookie: session } })).status).toBe(401)
  })
})

describe('security headers', () => {
  it('sets a strict referrer policy, CSP and no-store on invitation pages', async () => {
    const res = await call('/i/not-a-real-token')
    expect(res.status).toBe(404)
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('DENY')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-robots-tag')).toMatch(/noindex/)
    const csp = res.headers.get('content-security-policy')!
    expect(csp).toContain(`default-src 'self'`)
    expect(csp).toContain(`frame-ancestors 'none'`)
    expect(csp).not.toMatch(/https?:\/\//) // no third-party origins at all
  })
})

describe('the guest journey', () => {
  let danielUrl = ''
  let alexUrl = ''

  it('admin creates invitations and gets links on the public site URL', async () => {
    const a = await (await asAdmin('/api/admin/invitations', { method: 'POST', json: { guestName: 'דניאל כהן', guestsAllowed: true } })).json()
    const b = await (await asAdmin('/api/admin/invitations', { method: 'POST', json: { guestName: 'Alex Levi', guestsAllowed: false, language: 'en' } })).json()
    danielUrl = a.url
    alexUrl = b.url
    expect(danielUrl).toMatch(/^https:\/\/wedding-example\.duckdns\.org\/i\/[\w-]{43}$/)
    expect(alexUrl).not.toBe(danielUrl)
  })

  it('renders a personal Hebrew invitation that shows only that guest', async () => {
    const res = await call(`/i/${tokenFrom(danielUrl)}`)
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('דניאל כהן')
    expect(html).toMatch(/<html[^>]*lang="he"[^>]*dir="rtl"|<html[^>]*dir="rtl"[^>]*lang="he"/)
    expect(html).not.toContain('Alex Levi')
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\//) // no third-party scripts
  })

  it('renders an English invitation when the admin chose English', async () => {
    const html = await (await call(`/i/${tokenFrom(alexUrl)}`)).text()
    expect(html).toMatch(/<html[^>]*lang="en"/)
    expect(html).toContain('Alex Levi')
    expect(html).not.toContain('דניאל כהן')
  })

  it('returns 404 for unknown tokens, on the page and the API', async () => {
    const fake = 'A'.repeat(43)
    expect((await call(`/i/${fake}`)).status).toBe(404)
    expect((await guest(fake)).status).toBe(404)
    expect((await call('/api/rsvp')).status).toBe(404)
    expect((await guest(fake, { method: 'PUT', json: { rsvpStatus: 'attending' } })).status).toBe(404)
  })

  it('accepts an RSVP with guests, and updates it in place', async () => {
    const token = tokenFrom(danielUrl)
    const first = await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['מאיה כהן', 'Kid One'], dietaryNotes: 'צמחוני', message: '' } })
    expect(first.status).toBe(200)
    expect((await first.json()).extraGuests).toEqual(['מאיה כהן', 'Kid One'])

    const second = await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['מאיה כהן'], dietaryNotes: 'צמחוני', message: '' } })
    expect((await second.json()).extraGuests).toEqual(['מאיה כהן'])
    expect((await (await guest(token)).json()).rsvpStatus).toBe('attending')
  })

  it('rejects invalid submissions with a clear error and no change', async () => {
    const res = await guest(tokenFrom(alexUrl), { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['Uninvited'] } })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.data.code).toBe('guests_not_allowed')
    expect((await (await guest(tokenFrom(alexUrl))).json()).rsvpStatus).toBe('pending')
  })

  it('dashboard counts people, not links', async () => {
    const { stats, invitations } = await (await asAdmin('/api/admin/invitations')).json()
    expect(invitations).toHaveLength(2)
    expect(stats).toMatchObject({ invited: 2, accepted: 1, pending: 1, declined: 0, confirmedExtraGuests: 1, confirmedAttendees: 2 })
  })

  it('exports the planner list as Excel-friendly CSV', async () => {
    const res = await asAdmin('/api/admin/csv/planner.csv')
    expect(res.headers.get('content-type')).toMatch(/text\/csv; charset=utf-8/)
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="wedding-planner-/)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]) // UTF-8 BOM
    const rows = parseCsv(new TextDecoder().decode(bytes))
    expect(rows.slice(1).map(r => r.slice(0, 3))).toEqual([['דניאל כהן', 'Invited guest', ''], ['מאיה כהן', 'Additional guest', 'דניאל כהן']])
  })

  it('imports a CSV after preview, all or nothing', async () => {
    const csv = '﻿name,plus_one_allowed\nנועה ישראלי,true\nTom Israeli,false\n'
    const preview = await (await asAdmin('/api/admin/import/preview', { method: 'POST', json: { csv } })).json()
    expect(preview.totals).toMatchObject({ rows: 2, valid: 2, errors: 0 })
    expect((await (await asAdmin('/api/admin/invitations')).json()).invitations).toHaveLength(2) // preview wrote nothing

    const bad = await asAdmin('/api/admin/import/commit', { method: 'POST', json: { csv: `${csv},true\n` } })
    expect(bad.status).toBe(400)
    expect((await (await asAdmin('/api/admin/invitations')).json()).invitations).toHaveLength(2)

    const { created } = await (await asAdmin('/api/admin/import/commit', { method: 'POST', json: { csv } })).json()
    expect(created.map((c: { guestName: string }) => c.guestName)).toEqual(['נועה ישראלי', 'Tom Israeli'])
    expect((await call(`/i/${tokenFrom(created[0].url)}`)).status).toBe(200)

    const links = parseCsv(await (await asAdmin(`/api/admin/csv/invitations.csv?ids=${created.map((c: { id: number }) => c.id).join(',')}`)).text())
    expect(links.slice(1).map(r => r[0]).sort()).toEqual(['Tom Israeli', 'נועה ישראלי'])
    expect(links.find(r => r[0] === 'נועה ישראלי')![1]).toBe(created[0].url)
  })

  it('a regenerated link replaces the old one', async () => {
    const { invitations } = await (await asAdmin('/api/admin/invitations')).json()
    const daniel = invitations.find((i: { guestName: string }) => i.guestName === 'דניאל כהן')
    const next = await (await asAdmin(`/api/admin/invitations/${daniel.id}/regenerate`, { method: 'POST' })).json()
    expect(next.url).not.toBe(danielUrl)
    expect((await call(`/i/${tokenFrom(danielUrl)}`)).status).toBe(404)
    const res = await guest(tokenFrom(next.url))
    expect((await res.json()).rsvpStatus).toBe('attending') // the RSVP survived
  })

  it('rate limits invitation lookups per address', async () => {
    const statuses = new Set<number>()
    for (let i = 0; i < 95; i++) statuses.add((await guest('B'.repeat(43), { ip: '10.7.7.7' })).status)
    expect([...statuses].sort()).toEqual([404, 429])
    expect((await guest('B'.repeat(43), { ip: '10.7.7.8' })).status).toBe(404) // other addresses are unaffected
  })
})
