/**
 * End-to-end checks against the production build.
 * Run `npm run build` first; the suite starts `.output/server/index.mjs` on a
 * spare port with a throwaway database.
 */
import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hashPassword } from '../../server/core/auth'
import { parseCsv } from '../../server/core/csv'

const PORT = 4300 + Math.floor(Math.random() * 500)
const ORIGIN = `http://127.0.0.1:${PORT}`
const BASE_DOMAIN = 'wedding-example.duckdns.org'
const PASSWORD = 'e2e-only-password-not-a-real-one'
const dir = mkdtempSync(join(tmpdir(), 'oath-e2e-'))
let server: ChildProcess
let owner = ''
let nextIp = 10

type Init = Omit<RequestInit, 'body'> & { json?: unknown, raw?: Uint8Array, ip?: string, host?: string, cookie?: string }
function call(path: string, init: Init = {}) {
  const headers = new Headers(init.headers)
  if (init.json !== undefined) headers.set('content-type', 'application/json')
  if (init.ip) headers.set('x-forwarded-for', init.ip)
  if (init.host) headers.set('x-forwarded-host', init.host)
  if (init.cookie) headers.set('cookie', init.cookie)
  if (init.method && init.method !== 'GET' && !headers.has('origin')) headers.set('origin', init.host ? `https://${init.host}` : ORIGIN)
  return fetch(ORIGIN + path, { ...init, headers, body: init.raw ?? (init.json !== undefined ? JSON.stringify(init.json) : undefined), redirect: 'manual' })
}
const asOwner = (path: string, init: Init = {}) => call(path, { ...init, cookie: owner })
const tokenFrom = (url: string) => url.split('/i/')[1]!
const guest = (token: string, init: Init = {}) => call('/api/rsvp', { ...init, headers: { authorization: `Bearer ${token}` } })
/** Sign in from a fresh address each time so the per-address lockout never interferes. */
async function signIn(username: string, password: string) {
  const res = await call('/api/admin/login', { method: 'POST', json: { username, password }, ip: `10.50.0.${nextIp++}` })
  return { res, cookie: res.headers.get('set-cookie')?.split(';')[0] ?? '' }
}

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
      SITE_URL: `https://${BASE_DOMAIN}`,
      BASE_DOMAIN,
      COOKIE_SECURE: 'false',
      WHATSAPP_DIR: join(dir, 'whatsapp'),
      WHATSAPP_TRANSPORT: 'fake',
      WHATSAPP_MIN_GAP_MS: '0',
      WHATSAPP_MAX_GAP_MS: '0',
    },
    stdio: 'ignore',
  })
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(`${ORIGIN}/api/health`)).ok) break }
    catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 150))
  }
  const { res, cookie } = await signIn('admin', PASSWORD)
  expect(res.status).toBe(200)
  expect(res.headers.get('set-cookie')).toMatch(/HttpOnly/i)
  expect(res.headers.get('set-cookie')).toMatch(/SameSite=Strict/i)
  expect(res.headers.get('set-cookie')).toMatch(/Domain=wedding-example\.duckdns\.org/i) // shared with campaign subdomains
  owner = cookie
})

afterAll(() => {
  server?.kill('SIGTERM')
  rmSync(dir, { recursive: true, force: true })
})

describe('admin access control', () => {
  const protectedRoutes: [string, string][] = [
    ['GET', '/api/admin/campaigns'],
    ['POST', '/api/admin/campaigns'],
    ['GET', '/api/admin/c/1'],
    ['PATCH', '/api/admin/c/1'],
    ['DELETE', '/api/admin/c/1'],
    ['POST', '/api/admin/c/1/password'],
    ['PUT', '/api/admin/c/1/content'],
    ['PUT', '/api/admin/c/1/design'],
    ['GET', '/api/admin/c/1/design/versions'],
    ['POST', '/api/admin/c/1/design/versions/1/restore'],
    ['PUT', '/api/admin/c/1/whatsapp'],
    ['PUT', '/api/admin/c/1/photos/hero'],
    ['DELETE', '/api/admin/c/1/photos/hero'],
    ['GET', '/api/admin/c/1/invitations'],
    ['POST', '/api/admin/c/1/invitations'],
    ['PATCH', '/api/admin/c/1/invitations/1'],
    ['DELETE', '/api/admin/c/1/invitations/1'],
    ['POST', '/api/admin/c/1/invitations/1/regenerate'],
    ['POST', '/api/admin/c/1/invitations/1/revoke'],
    ['POST', '/api/admin/c/1/import/preview'],
    ['POST', '/api/admin/c/1/import/commit'],
    ['GET', '/api/admin/c/1/csv/invitations.csv'],
    ['GET', '/api/admin/c/1/csv/planner.csv'],
    ['GET', '/api/admin/c/1/csv/template.csv'],
    ['GET', '/api/admin/c/1/whatsapp'],
    ['POST', '/api/admin/c/1/whatsapp/link'],
    ['DELETE', '/api/admin/c/1/whatsapp/link'],
    ['POST', '/api/admin/c/1/whatsapp/send'],
    ['DELETE', '/api/admin/c/1/whatsapp/send'],
    ['GET', '/api/admin/whatsapp'],
    ['POST', '/api/admin/whatsapp'],
    ['DELETE', '/api/admin/whatsapp'],
  ]
  it.each(protectedRoutes)('%s %s requires a session', async (method, path) => {
    const json = method === 'GET' ? undefined : {}
    expect((await call(path, { method, json })).status).toBe(401)
    expect((await call(path, { method, json, cookie: 'oath_admin=forged-session-value' })).status).toBe(401)
  })

  it('redirects admin pages to sign-in', async () => {
    for (const path of ['/admin', '/admin/c/1', '/admin/c/1/settings']) {
      const res = await call(path)
      expect([res.status, res.headers.get('location')]).toEqual([302, '/admin/login'])
    }
  })

  it('rejects wrong passwords and unknown names with the same answer', async () => {
    const wrong = await signIn('admin', 'not-it')
    const unknown = await signIn('no-such-campaign', PASSWORD)
    const noLogin = await signIn('victor-and-dani', PASSWORD) // exists, but has no couple password
    for (const { res, cookie } of [wrong, unknown, noLogin]) {
      expect(res.status).toBe(401)
      expect(cookie).toBe('')
      expect((await res.json()).message).toBe('Wrong name or password.')
    }
  })

  it('refuses cross-origin writes even with a valid session', async () => {
    const res = await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName: 'CSRF' }, headers: { origin: 'https://evil.example' } })
    expect(res.status).toBe(403)
  })

  it('locks out repeated sign-in failures from one address', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 7; i++) statuses.push((await call('/api/admin/login', { method: 'POST', json: { username: 'admin', password: `guess-${i}` }, ip: '10.9.9.9' })).status)
    expect(statuses).toEqual([401, 401, 401, 401, 401, 429, 429])
    expect((await call('/api/admin/login', { method: 'POST', json: { username: 'admin', password: PASSWORD }, ip: '10.9.9.9' })).status).toBe(429)
  })

  it('logging out ends the session on the server', async () => {
    const { cookie } = await signIn('admin', PASSWORD)
    expect((await call('/api/admin/campaigns', { cookie })).status).toBe(200)
    await call('/api/admin/logout', { method: 'POST', cookie })
    expect((await call('/api/admin/campaigns', { cookie })).status).toBe(401)
  })
})

describe('security headers', () => {
  it('sets a strict referrer policy, CSP and no-store on invitation pages', async () => {
    const res = await call('/i/not-a-real-token')
    expect(res.status).toBe(404)
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('x-frame-options')).toBe('SAMEORIGIN')
    expect(res.headers.get('cache-control')).toBe('no-store')
    expect(res.headers.get('x-robots-tag')).toMatch(/noindex/)
    const csp = res.headers.get('content-security-policy')!
    expect(csp).toContain(`default-src 'self'`)
    expect(csp).toContain(`frame-ancestors 'self'`)
    expect(csp).not.toMatch(/https?:\/\//) // no third-party origins at all
  })
})

describe('the guest journey (campaign 1, Victor and Dani)', () => {
  let danielUrl = ''
  let alexUrl = ''

  it('links are issued on the campaign\'s own subdomain', async () => {
    const a = await (await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName: 'דניאל כהן', guestsAllowed: true } })).json()
    const b = await (await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName: 'Alex Levi', guestsAllowed: false, language: 'en' } })).json()
    danielUrl = a.url
    alexUrl = b.url
    expect(danielUrl).toMatch(/^https:\/\/victor-and-dani\.wedding-example\.duckdns\.org\/i\/[\w-]{43}$/)
    expect(alexUrl).not.toBe(danielUrl)
  })

  it('renders a personal Hebrew invitation that shows only that guest', async () => {
    const res = await call(`/i/${tokenFrom(danielUrl)}`, { host: `victor-and-dani.${BASE_DOMAIN}` })
    expect(res.status).toBe(200)
    const html = await res.text()
    expect(html).toContain('דניאל כהן')
    expect(html).toContain('ודני')
    expect(html).toMatch(/<html[^>]*lang="he"/)
    expect(html).toMatch(/<html[^>]*dir="rtl"/)
    expect(html).not.toContain('Alex Levi')
    expect(html).not.toMatch(/<script[^>]+src="https?:\/\//) // no third-party scripts
  })

  it('a link works on any hostname, so links from before the platform keep working', async () => {
    for (const host of [BASE_DOMAIN, 'some-tunnel.example']) expect((await call(`/i/${tokenFrom(danielUrl)}`, { host })).status).toBe(200)
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

  it('stays signed in when the browser also sends a stale session cookie first', async () => {
    const stale = 'oath_admin=left-over-from-an-older-sign-in'
    expect(await (await call('/api/admin/session', { cookie: `${stale}; ${owner}` })).json()).toMatchObject({ authenticated: true, role: 'owner' })
    expect((await call('/admin', { cookie: `lang=he; ${stale}; ${owner}` })).status).toBe(200)
    expect(await (await call('/api/admin/session', { cookie: stale })).json()).toMatchObject({ authenticated: false })
  })

  it('records that a guest opened their link, but not when an admin checks it', async () => {
    const list = async () => (await (await asOwner('/api/admin/c/1/invitations')).json()).invitations as { guestName: string, firstOpenedAt: string | null }[]
    const fresh = await (await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName: 'Unopened Guest' } })).json()
    await call('/api/rsvp', { headers: { authorization: `Bearer ${tokenFrom(fresh.url)}` }, cookie: owner })
    const asAdmin = await (await call(`/i/${tokenFrom(fresh.url)}`, { cookie: owner })).text()
    expect(asAdmin).toContain('not recorded as the guest opening')
    expect((await list()).find(i => i.guestName === 'Unopened Guest')!.firstOpenedAt).toBeNull()
    expect(await (await call(`/i/${tokenFrom(fresh.url)}`)).text()).not.toContain('not recorded as the guest opening')
    expect((await list()).find(i => i.guestName === 'Unopened Guest')!.firstOpenedAt).not.toBeNull()
    await asOwner(`/api/admin/c/1/invitations/${fresh.id}`, { method: 'DELETE' })
  })

  it('accepts an RSVP with guests, and updates it in place', async () => {
    const token = tokenFrom(danielUrl)
    const first = await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['מאיה כהן', 'Kid One'], dietaryNotes: 'צמחוני', message: '' } })
    expect(first.status).toBe(200)
    expect((await first.json()).extraGuests).toEqual(['מאיה כהן', 'Kid One'])
    const second = await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['מאיה כהן'], dietaryNotes: 'צמחוני', message: '' } })
    expect((await second.json()).extraGuests).toEqual(['מאיה כהן'])
    expect((await (await guest(token)).json()).invitation.rsvpStatus).toBe('attending')
  })

  it('rejects invalid submissions with a clear error and no change', async () => {
    const res = await guest(tokenFrom(alexUrl), { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['Uninvited'] } })
    expect(res.status).toBe(400)
    expect((await res.json()).data.code).toBe('guests_not_allowed')
    expect((await (await guest(tokenFrom(alexUrl))).json()).invitation.rsvpStatus).toBe('pending')
  })

  it('dashboard counts people, not links', async () => {
    const { stats, invitations } = await (await asOwner('/api/admin/c/1/invitations')).json()
    expect(invitations).toHaveLength(2)
    expect(stats).toMatchObject({ invited: 2, opened: 2, accepted: 1, pending: 1, declined: 0, confirmedExtraGuests: 1, confirmedAttendees: 2 })
  })

  it('exports the planner list as Excel-friendly CSV', async () => {
    const res = await asOwner('/api/admin/c/1/csv/planner.csv')
    expect(res.headers.get('content-type')).toMatch(/text\/csv; charset=utf-8/)
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="victor-and-dani-planner-/)
    const bytes = new Uint8Array(await res.arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xEF, 0xBB, 0xBF]) // UTF-8 BOM
    const rows = parseCsv(new TextDecoder().decode(bytes))
    expect(rows.slice(1).map(r => r.slice(0, 3))).toEqual([['דניאל כהן', 'Invited guest', ''], ['מאיה כהן', 'Additional guest', 'דניאל כהן']])
  })

  it('imports a CSV after preview, all or nothing', async () => {
    const csv = '﻿name,plus_one_allowed\nנועה ישראלי,true\nTom Israeli,1\n'
    const preview = await (await asOwner('/api/admin/c/1/import/preview', { method: 'POST', json: { csv } })).json()
    expect(preview.totals).toMatchObject({ rows: 2, valid: 2, errors: 0 })
    expect((await (await asOwner('/api/admin/c/1/invitations')).json()).invitations).toHaveLength(2) // preview wrote nothing

    const bad = await asOwner('/api/admin/c/1/import/commit', { method: 'POST', json: { csv: `${csv},true\n` } })
    expect(bad.status).toBe(400)
    expect((await (await asOwner('/api/admin/c/1/invitations')).json()).invitations).toHaveLength(2)

    const { created } = await (await asOwner('/api/admin/c/1/import/commit', { method: 'POST', json: { csv } })).json()
    expect(created.map((c: { guestName: string, guestLimit: number }) => [c.guestName, c.guestLimit])).toEqual([['נועה ישראלי', 20], ['Tom Israeli', 1]])
    expect((await call(`/i/${tokenFrom(created[0].url)}`)).status).toBe(200)

    const links = parseCsv(await (await asOwner(`/api/admin/c/1/csv/invitations.csv?ids=${created.map((c: { id: number }) => c.id).join(',')}`)).text())
    expect(links.slice(1).map(r => r[0]).sort()).toEqual(['Tom Israeli', 'נועה ישראלי'])
    expect(links.find(r => r[0] === 'נועה ישראלי')![2]).toBe(created[0].url)
  })

  it('a regenerated link replaces the old one', async () => {
    const { invitations } = await (await asOwner('/api/admin/c/1/invitations')).json()
    const daniel = invitations.find((i: { guestName: string }) => i.guestName === 'דניאל כהן')
    const next = await (await asOwner(`/api/admin/c/1/invitations/${daniel.id}/regenerate`, { method: 'POST' })).json()
    expect(next.url).not.toBe(danielUrl)
    expect((await call(`/i/${tokenFrom(danielUrl)}`)).status).toBe(404)
    expect((await (await guest(tokenFrom(next.url))).json()).invitation.rsvpStatus).toBe('attending') // the RSVP survived
  })

  it('rate limits invitation lookups per address', async () => {
    const statuses = new Set<number>()
    for (let i = 0; i < 95; i++) statuses.add((await guest('B'.repeat(43), { ip: '10.7.7.7' })).status)
    expect([...statuses].sort()).toEqual([404, 429])
    expect((await guest('B'.repeat(43), { ip: '10.7.7.8' })).status).toBe(404) // other addresses are unaffected
  })
})

describe('campaigns and couples', () => {
  let danaId = 0
  let danaCookie = ''
  let danaGuestUrl = ''
  const danaHost = `dana-and-omer.${BASE_DOMAIN}`

  it('the owner creates a campaign, which starts as a draft', async () => {
    const res = await asOwner('/api/admin/campaigns', { method: 'POST', json: { slug: 'Dana-And-Omer', couple: { en: { first: 'Dana', second: 'Omer' }, he: { first: 'דנה', second: 'עומר' } } } })
    expect(res.status).toBe(201)
    const created = await res.json()
    danaId = created.id
    expect(created).toMatchObject({ slug: 'dana-and-omer', status: 'draft', hasPassword: false, siteUrl: `https://${danaHost}` })
    expect((await asOwner('/api/admin/campaigns', { method: 'POST', json: { slug: 'dana-and-omer' } })).status).toBe(400)
    expect((await (await asOwner('/api/admin/campaigns')).json()).map((c: { slug: string }) => c.slug)).toEqual(['victor-and-dani', 'dana-and-omer'])
  })

  it('a draft is closed to the public and to guests, and open to its admins', async () => {
    danaGuestUrl = (await (await asOwner(`/api/admin/c/${danaId}/invitations`, { method: 'POST', json: { guestName: 'אורחת של דנה', guestsAllowed: true } })).json()).url
    expect(danaGuestUrl).toContain(`https://${danaHost}/i/`)
    expect((await call('/', { host: danaHost })).status).toBe(404)
    expect((await call('/w/dana-and-omer')).status).toBe(404)
    const page = await call(`/i/${tokenFrom(danaGuestUrl)}`)
    expect(page.status).toBe(404)
    expect(await page.text()).not.toContain('אורחת של דנה')
    expect((await guest(tokenFrom(danaGuestUrl), { method: 'PUT', json: { rsvpStatus: 'attending' } })).status).toBe(400)
    expect((await call('/w/dana-and-omer', { cookie: owner })).status).toBe(200) // preview
    expect((await call('/', { host: danaHost, cookie: owner })).status).toBe(200) // and at its own address
    expect((await (await asOwner(`/api/admin/c/${danaId}`)).json()).previewUrl).toBe(`https://${danaHost}`)
  })

  it('HTTPS certificates are approved only for real, unarchived campaign hosts', async () => {
    const check = async (domain: string) => (await call(`/api/tls-check?domain=${domain}`)).status
    expect(await check(BASE_DOMAIN)).toBe(200)
    expect(await check(`victor-and-dani.${BASE_DOMAIN}`)).toBe(200)
    expect(await check(danaHost)).toBe(200)
    expect(await check(`nobody.${BASE_DOMAIN}`)).toBe(404)
    expect(await check(`a.victor-and-dani.${BASE_DOMAIN}`)).toBe(404)
    expect(await check('evil.example')).toBe(404)
  })

  it('the owner issues the couple a password, shown once and stored hashed', async () => {
    const { username, password } = await (await asOwner(`/api/admin/c/${danaId}/password`, { method: 'POST' })).json()
    expect(username).toBe('dana-and-omer')
    expect(password.length).toBeGreaterThanOrEqual(16)
    const { res, cookie } = await signIn(username, password)
    expect(await res.json()).toMatchObject({ role: 'couple', campaignId: danaId })
    danaCookie = cookie
    expect(JSON.stringify(await (await asOwner(`/api/admin/c/${danaId}`)).json())).not.toContain(password)
  })

  it('a couple sees and manages only their own campaign', async () => {
    const mine = await (await call('/api/admin/campaigns', { cookie: danaCookie })).json()
    expect(mine.map((c: { slug: string }) => c.slug)).toEqual(['dana-and-omer'])
    expect((await call(`/api/admin/c/${danaId}/invitations`, { cookie: danaCookie })).status).toBe(200)

    // Every route of someone else's campaign answers 404, exactly as if it did not exist.
    const others: [string, string][] = [
      ['GET', '/api/admin/c/1'], ['GET', '/api/admin/c/1/invitations'], ['POST', '/api/admin/c/1/invitations'], ['PATCH', '/api/admin/c/1/invitations/1'],
      ['DELETE', '/api/admin/c/1/invitations/1'], ['PUT', '/api/admin/c/1/content'], ['PUT', '/api/admin/c/1/design'], ['PUT', '/api/admin/c/1/whatsapp'],
      ['POST', '/api/admin/c/1/import/commit'], ['GET', '/api/admin/c/1/csv/planner.csv'], ['PUT', '/api/admin/c/1/photos/hero'], ['GET', '/api/admin/c/999'],
    ]
    for (const [method, path] of others) {
      const res = await call(path, { method, json: method === 'GET' ? undefined : { guestName: 'x', csv: 'name\nx' }, cookie: danaCookie })
      expect([path, res.status]).toEqual([path, 404])
    }
    expect((await (await asOwner('/api/admin/c/1/invitations')).json()).invitations.some((i: { guestName: string }) => i.guestName === 'x')).toBe(false)

    // Their own campaign's ids cannot be used to reach into another campaign either.
    const vdInvite = (await (await asOwner('/api/admin/c/1/invitations')).json()).invitations[0]
    expect((await call(`/api/admin/c/${danaId}/invitations/${vdInvite.id}`, { method: 'PATCH', json: { guestName: 'Hijacked' }, cookie: danaCookie })).status).toBe(404)
    expect((await call(`/api/admin/c/${danaId}/invitations/${vdInvite.id}`, { method: 'DELETE', cookie: danaCookie })).status).toBe(404)
  })

  it('owner-only actions are refused to a couple, even on their own campaign', async () => {
    const attempts: [string, string, unknown][] = [
      ['POST', '/api/admin/campaigns', { slug: 'sneaky-one' }],
      ['PATCH', `/api/admin/c/${danaId}`, { status: 'live' }],
      ['DELETE', `/api/admin/c/${danaId}`, { confirm: 'dana-and-omer' }],
      ['POST', `/api/admin/c/${danaId}/password`, {}],
      ['POST', '/api/admin/whatsapp', {}],
      ['DELETE', '/api/admin/whatsapp', {}],
    ]
    expect((await call('/api/admin/whatsapp', { cookie: danaCookie })).status).toBe(403)
    for (const [method, path] of [['GET', '/api/admin/c/1/whatsapp'], ['POST', '/api/admin/c/1/whatsapp/link'], ['POST', '/api/admin/c/1/whatsapp/send']] as const) {
      expect([path, (await call(path, { method, json: method === 'GET' ? undefined : {}, cookie: danaCookie })).status]).toEqual([path, 404])
    }
    for (const [method, path, json] of attempts) expect([path, (await call(path, { method, json, cookie: danaCookie })).status]).toEqual([path, 403])
    const design = await (await call(`/api/admin/c/${danaId}/design`, { method: 'PUT', json: { theme: 'nocturne', preset: 'nocturne-oxblood', colours: { accent: '#E0B0FF', text: 'expression(alert(1))' }, customCss: 'body{display:none}' }, cookie: danaCookie })).json()
    expect(design.design).toMatchObject({ preset: 'nocturne-oxblood', colours: { accent: '#e0b0ff', text: '#efe6d6', ground: '#16080c' }, options: { emblem: 'heart' }, customCss: '' })
    // The guest's page is drawn in those colours.
    const page = await (await call(`/w/dana-and-omer`, { cookie: danaCookie })).text()
    expect(page).toContain('--color-gold:#e0b0ff')
    expect(page).not.toContain('expression(')
    // A chosen typeface is linked from the page, as a real stylesheet on this server, with its font file beside it.
    const lettered = await (await call(`/api/admin/c/${danaId}/design`, { method: 'PUT', json: { lettering: { display: 'suez', body: 'comic-sans' } }, cookie: danaCookie })).json()
    expect(lettered.design.lettering).toEqual({ display: 'suez', latin: 'unifraktur', body: 'david', numeral: 'pirata' })
    const withFont = await (await call(`/w/dana-and-omer`, { cookie: danaCookie })).text()
    expect(withFont).toContain('href="/fonts/fontsource-suez-one/index.css"')
    expect(withFont).not.toContain('/fonts/fontsource-variable-rubik')
    const sheet = await call('/fonts/fontsource-suez-one/index.css')
    expect([sheet.status, sheet.headers.get('content-type')]).toEqual([200, expect.stringContaining('text/css')])
    const fontFile = (await sheet.text()).match(/url\(\.\/(files\/[^)]+\.woff2)\)/)![1]
    expect((await call(`/fonts/fontsource-suez-one/${fontFile}`)).status).toBe(200)
    // Another style is a different page altogether, with its own typefaces, and the couple's headline above their names.
    const rose = await (await call(`/api/admin/c/${danaId}/design`, { method: 'PUT', json: { theme: 'keepsake' }, cookie: danaCookie })).json()
    expect(rose.design).toMatchObject({ theme: 'keepsake', preset: 'keepsake-plum', lettering: { latin: 'playball' }, options: { portrait: 'gold', frame: 'arch' } })
    const current = (await (await call(`/api/admin/c/${danaId}`, { cookie: danaCookie })).json()).content
    current.copy.he.headline = 'בית <i>לוי</i>'
    expect((await call(`/api/admin/c/${danaId}/content`, { method: 'PUT', json: current, cookie: danaCookie })).status).toBe(200)
    const rosePage = await (await call(`/w/dana-and-omer`, { cookie: danaCookie })).text()
    expect(rosePage).toContain('class="keep ')
    expect(rosePage).toContain('בית &lt;i&gt;לוי&lt;/i&gt;')
    expect(rosePage).toContain('k-ribbon')
    expect(rosePage).toContain('href="/fonts/fontsource-playball/index.css"')
    expect(rosePage).toContain('--color-ground:#2e0c22')
    await call(`/api/admin/c/${danaId}/design`, { method: 'PUT', json: { theme: 'nocturne', preset: 'nocturne-oxblood', colours: { accent: '#e0b0ff' } }, cookie: danaCookie })
    // A palette guests could not read is refused, with the reason.
    const unreadable = await call(`/api/admin/c/${danaId}/design`, { method: 'PUT', json: { colours: { text: '#1a0a0e' } }, cookie: danaCookie })
    expect(unreadable.status).toBe(400)
    expect((await unreadable.json()).message).toMatch(/hard to read/)
    // Earlier designs can be brought back, by this couple only.
    const versions = await (await call(`/api/admin/c/${danaId}/design/versions`, { cookie: danaCookie })).json()
    expect(versions).toHaveLength(4)
    expect((await call('/api/admin/c/1/design/versions', { cookie: danaCookie })).status).toBe(404)
    expect((await call(`/api/admin/c/1/design/versions/${versions[0].id}/restore`, { method: 'POST', cookie: danaCookie })).status).toBe(404)
    const restored = await (await call(`/api/admin/c/${danaId}/design/versions/${versions[2].id}/restore`, { method: 'POST', cookie: danaCookie })).json()
    expect(restored.design).toMatchObject({ preset: 'nocturne-oxblood', colours: { accent: '#e0b0ff' }, lettering: { display: 'frank-ruhl' } })
  })

  it('the couple edits details; unsafe links and bad values are refused', async () => {
    const current = (await (await call(`/api/admin/c/${danaId}`, { cookie: danaCookie })).json()).content
    const put = (content: unknown) => call(`/api/admin/c/${danaId}/content`, { method: 'PUT', json: content, cookie: danaCookie })
    expect((await put({ ...current, links: { waze: 'javascript:alert(1)', googleMaps: '' } })).status).toBe(400)
    expect((await put({ ...current, date: 'next spring' })).status).toBe(400)
    const saved = await (await put({ ...current, date: '2027-09-09', ceremonyTime: '', languages: ['he'], venue: { ...current.venue, he: { name: 'גן <b>האירועים</b>', address: 'חיפה' } }, rsvp: { ...current.rsvp, guestLimit: 1 } })).json()
    expect(saved.content).toMatchObject({ date: '2027-09-09', ceremonyTime: '', languages: ['he'] })
  })

  it('going live opens the couple\'s subdomain with their own names, escaped, in their only language', async () => {
    expect((await asOwner(`/api/admin/c/${danaId}`, { method: 'PATCH', json: { status: 'live' } })).status).toBe(200)
    const html = await (await call('/', { host: danaHost })).text()
    expect(html).toContain('דנה')
    expect(html).toContain('ועומר')
    expect(html).not.toContain('ויקטור')
    expect(html).toContain('--color-ground:#16080c') // the couple's colours reach the page itself
    expect(html).toContain('גן &lt;b&gt;האירועים&lt;/b&gt;') // admin-entered text is never markup
    expect(html).not.toContain('>English<') // one language: no switcher
    // The platform's own address is not anybody's invitation.
    expect(await (await call('/', { host: BASE_DOMAIN })).text()).not.toContain('דנה')
    expect((await call('/api/calendar/dana-and-omer.ics')).headers.get('content-type')).toMatch(/text\/calendar/)
  })

  it('the campaign\'s guest limit applies to its guests', async () => {
    const token = tokenFrom(danaGuestUrl)
    expect((await (await guest(token)).json()).invitation.guestLimit).toBe(1)
    const tooMany = await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['A', 'B'] } })
    expect([tooMany.status, (await tooMany.json()).data.code]).toEqual([400, 'too_many_guests'])
    expect((await guest(token, { method: 'PUT', json: { rsvpStatus: 'attending', extraGuests: ['A'] } })).status).toBe(200)
  })

  it('closing replies keeps the invitation visible and refuses new answers', async () => {
    const current = (await (await asOwner(`/api/admin/c/${danaId}`)).json()).content
    await asOwner(`/api/admin/c/${danaId}/content`, { method: 'PUT', json: { ...current, rsvp: { ...current.rsvp, closed: true } } })
    const token = tokenFrom(danaGuestUrl)
    expect((await call(`/i/${token}`)).status).toBe(200)
    const res = await guest(token, { method: 'PUT', json: { rsvpStatus: 'declined' } })
    expect([res.status, (await res.json()).data.code]).toEqual([400, 'rsvp_closed'])
    expect((await (await guest(token)).json()).invitation.rsvpStatus).toBe('attending')
  })

  it('photos are uploaded per campaign, re-encoded, and anything else is refused', async () => {
    const png = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#803040' } }).png().toBuffer()
    const up = await call(`/api/admin/c/${danaId}/photos/hero`, { method: 'PUT', raw: new Uint8Array(png), headers: { 'content-type': 'image/png' }, cookie: danaCookie })
    expect(up.status).toBe(200)
    expect((await up.json()).photos.hero).toBeTruthy()
    const served = await call(`/photos/${danaId}/hero?w=480`)
    expect([served.status, served.headers.get('content-type')]).toEqual([200, 'image/webp'])
    expect((await call('/photos/1/hero?w=480')).status).toBe(404) // not shared with other campaigns

    const notImage = await call(`/api/admin/c/${danaId}/photos/second`, { method: 'PUT', raw: new TextEncoder().encode('<svg onload=alert(1)>'), headers: { 'content-type': 'image/png' }, cookie: danaCookie })
    expect([notImage.status, (await notImage.json()).data.code]).toEqual([400, 'photo_invalid'])
    expect((await call(`/api/admin/c/${danaId}/photos/../../etc`, { method: 'PUT', raw: new Uint8Array(png), cookie: danaCookie })).status).not.toBe(200)

    const removed = await (await call(`/api/admin/c/${danaId}/photos/hero`, { method: 'DELETE', cookie: danaCookie })).json()
    expect(removed.photos.hero).toBeNull()
  })

  it('a reset password ends the couple\'s session', async () => {
    await asOwner(`/api/admin/c/${danaId}/password`, { method: 'POST' })
    expect((await call('/api/admin/campaigns', { cookie: danaCookie })).status).toBe(401)
  })

  it('deleting a campaign needs its address typed, and removes its guests and links only', async () => {
    expect((await asOwner(`/api/admin/c/${danaId}`, { method: 'DELETE', json: { confirm: 'wrong' } })).status).toBe(400)
    expect((await asOwner(`/api/admin/c/${danaId}`, { method: 'DELETE', json: { confirm: 'dana-and-omer' } })).status).toBe(200)
    expect((await call(`/i/${tokenFrom(danaGuestUrl)}`)).status).toBe(404)
    expect((await call('/', { host: danaHost })).status).toBe(404)
    expect((await (await asOwner('/api/admin/c/1/invitations')).json()).invitations.length).toBeGreaterThan(0)
  })
})

describe('Russian', () => {
  it('serves a left-to-right Russian invitation once the campaign offers it', async () => {
    const current = (await (await asOwner('/api/admin/c/1')).json()).content
    expect(current.couple.ru).toEqual({ first: '', second: '' })
    const saved = await asOwner('/api/admin/c/1/content', { method: 'PUT', json: { ...current, languages: ['he', 'en', 'ru'], couple: { ...current.couple, ru: { first: 'Виктор', second: 'Дани' } } } })
    expect(saved.status).toBe(200)
    const anna = await (await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName: 'Анна Петрова', language: 'ru' } })).json()
    expect(anna).toMatchObject({ language: 'ru', guestsAllowed: true })

    const html = await (await call(`/i/${tokenFrom(anna.url)}`)).text()
    expect(html).toMatch(/<html[^>]*lang="ru"/)
    expect(html).toMatch(/<html[^>]*dir="ltr"/)
    expect(html).toContain('Анна Петрова')
    expect(html).toContain('<title>Виктор и Дани</title>')
    expect(html).toContain('Подтверждение участия')
    // The switcher offers the other two languages by their own names.
    expect(html).toContain('>עברית<')
    expect(html).toContain('>English<')
  })
})

describe('automatic WhatsApp sending (stand-in account)', () => {
  const overview = async () => (await asOwner('/api/admin/c/1/whatsapp')).json()
  const waitUntilDone = async () => { for (let i = 0; i < 100; i++) { const o = await overview(); if (o.progress.state !== 'running') return o; await new Promise(r => setTimeout(r, 50)) } throw new Error('send did not finish') }

  it('refuses to send before an account is linked', async () => {
    const res = await asOwner('/api/admin/c/1/whatsapp/send', { method: 'POST', json: { sender: 'own' } })
    expect([res.status, (await res.json()).data.code]).toEqual([400, 'sender_not_linked'])
  })

  it('sends to guests with a phone number, marks them, and reports the ones that fail', async () => {
    const add = async (guestName: string, phone: string) => (await asOwner('/api/admin/c/1/invitations', { method: 'POST', json: { guestName, phone } })).json()
    const good = await add('Has WhatsApp', '054-555-1234')
    const bad = await add('No WhatsApp', '054-555-0000')
    expect(good.phone).toBe('+972545551234')

    expect((await (await asOwner('/api/admin/c/1/whatsapp/link', { method: 'POST' })).json()).state).toBe('linked')
    const before = await overview()
    expect(before.own.state).toBe('linked')
    expect(before.ready).toBeGreaterThanOrEqual(2)
    expect(before.withoutPhone).toBeGreaterThan(0)

    expect((await asOwner('/api/admin/c/1/whatsapp/send', { method: 'POST', json: { sender: 'own' } })).status).toBe(200)
    const after = await waitUntilDone()
    expect(after.progress).toMatchObject({ state: 'done', sender: 'own', failed: 1 })
    expect(after.progress.sent).toBeGreaterThanOrEqual(1)

    const list = (await (await asOwner('/api/admin/c/1/invitations')).json()).invitations as { id: number, sentAt: string | null, sendError: string, phone: string }[]
    expect(list.find(i => i.id === good.id)).toMatchObject({ sendError: '' })
    expect(list.find(i => i.id === good.id)!.sentAt).not.toBeNull()
    expect(list.find(i => i.id === bad.id)).toMatchObject({ sentAt: null, sendError: 'This number is not on WhatsApp.' })
    // Guests without a phone number were left alone.
    expect(list.filter(i => !i.phone).every(i => !i.sendError)).toBe(true)

    // A guest never sees phone numbers or sending details.
    const guestView = JSON.stringify(await (await guest(tokenFrom(good.url))).json())
    expect(guestView).not.toContain('545551234')
  })

  it('the shared account is linked by the owner and offered to campaigns without its pairing code', async () => {
    expect((await (await asOwner('/api/admin/whatsapp', { method: 'POST' })).json()).state).toBe('linked')
    const o = await overview()
    expect(o.platform.state).toBe('linked')
    expect(o.platform).not.toHaveProperty('qr')
    await asOwner('/api/admin/whatsapp', { method: 'DELETE' })
    expect((await overview()).platform.state).toBe('unlinked')
  })

  it('unlinking stops automatic sending', async () => {
    await asOwner('/api/admin/c/1/whatsapp/link', { method: 'DELETE' })
    expect((await overview()).own.state).toBe('unlinked')
    const res = await asOwner('/api/admin/c/1/whatsapp/send', { method: 'POST', json: { sender: 'own' } })
    expect(res.status).toBe(400)
  })
})
