#!/usr/bin/env node
/**
 * Real-browser check of the things only a browser can prove: that the page
 * reacts to a guest's answer without a reload, in every direction, at phone
 * and desktop widths, with no script errors.
 *
 *   npm run build && npm run test:browser
 *
 * Starts the production build on a spare port with a throwaway database and a
 * stand-in WhatsApp account, and drives headless Chrome over the DevTools
 * protocol. Needs Node 22+ and Google Chrome; no extra packages.
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomBytes, scryptSync } from 'node:crypto'

const CHROME = process.env.CHROME_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(existsSync)
if (!CHROME) { console.error('Chrome not found. Set CHROME_PATH.'); process.exit(2) }
if (!existsSync('.output/server/index.mjs')) { console.error('Build first: npm run build'); process.exit(2) }

const PORT = 4800 + Math.floor(Math.random() * 100), DEBUG = PORT + 100
const ORIGIN = `http://127.0.0.1:${PORT}`
const PASSWORD = 'browser-test-password'
const dir = mkdtempSync(join(tmpdir(), 'oath-browser-'))
const salt = randomBytes(16)
const sleep = ms => new Promise(r => setTimeout(r, ms))

const server = spawn('node', ['.output/server/index.mjs'], {
  stdio: 'ignore',
  env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1', DATABASE_PATH: join(dir, 'w.db'), PHOTOS_DIR: join(dir, 'photos'), WHATSAPP_DIR: join(dir, 'wa'),
    WHATSAPP_TRANSPORT: 'fake', WHATSAPP_MIN_GAP_MS: '0', WHATSAPP_MAX_GAP_MS: '0', TOKEN_SECRET: 'browser-test-secret-browser-test-secret-01', COOKIE_SECURE: 'false', BASE_DOMAIN: '', SITE_URL: ORIGIN,
    ADMIN_PASSWORD_HASH: `scrypt:${salt.toString('base64url')}:${scryptSync(PASSWORD, salt, 64).toString('base64url')}` },
})
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DEBUG}`, '--hide-scrollbars', '--no-first-run', `--user-data-dir=${join(dir, 'chrome')}`, 'about:blank'], { stdio: 'ignore' })

let failures = 0
const problems = []
function check(name, ok, detail = '') {
  if (!ok) failures++
  console.log(`${ok ? '  ok  ' : '  FAIL'}  ${name}${ok || !detail ? '' : `\n          ${detail}`}`)
}
function cleanup() {
  server.kill('SIGTERM'); chrome.kill()
  setTimeout(() => rmSync(dir, { recursive: true, force: true }), 300)
}

try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch(`${ORIGIN}/api/health`)).ok) break } catch { /* not up yet */ } await sleep(150) }

  // ---- data, through the real API
  let cookie = ''
  const api = async (method, path, body) => {
    const res = await fetch(ORIGIN + path, { method, headers: { 'content-type': 'application/json', origin: ORIGIN, cookie }, body: body ? JSON.stringify(body) : undefined })
    if (res.headers.get('set-cookie')) cookie = res.headers.get('set-cookie').split(';')[0]
    return res.json()
  }
  await api('POST', '/api/admin/login', { username: 'admin', password: PASSWORD })
  const guest = await api('POST', '/api/admin/c/1/invitations', { guestName: 'דניאל כהן', phone: '054-555-1234' })
  const alone = await api('POST', '/api/admin/c/1/invitations', { guestName: 'סבתא רחל', guestLimit: 0 })
  const english = await api('POST', '/api/admin/c/1/invitations', { guestName: 'Alex Levi', language: 'en' })
  const path = url => new URL(url).pathname

  // ---- browser
  let target
  for (let i = 0; i < 60 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${DEBUG}/json`)).json()).find(t => t.type === 'page') } catch { /* not up yet */ } }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise(r => ws.addEventListener('open', r))
  let id = 0
  const waiting = new Map()
  ws.addEventListener('message', (e) => {
    const m = JSON.parse(e.data)
    if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id) }
    if (m.method === 'Runtime.exceptionThrown') problems.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text)
    // The unknown-link page is meant to answer 404; that is not a script error.
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/status of 404.*\/i\/A+$/.test(`${m.params.entry.text} ${m.params.entry.url ?? ''}`)) problems.push(`${m.params.entry.text} ${m.params.entry.url ?? ''}`)
  })
  const send = (method, params = {}) => new Promise(r => { waiting.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
  const js = async (expression) => {
    const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (m.result.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description ?? 'evaluate failed')
    return m.result.result.value
  }
  const size = (w, h) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 700 })
  const open = async (url) => { await send('Page.navigate', { url: ORIGIN + url }); await until(`document.readyState === 'complete' && !!document.querySelector('.inv, .admin')`); await sleep(400) }
  const until = async (expression, ms = 8000) => { for (let t = 0; t < ms; t += 100) { if (await js(`!!(${expression})`)) return true; await sleep(100) } return false }
  const text = selector => js(`(document.querySelector(${JSON.stringify(selector)})?.innerText ?? '').replace(/\\s+/g, ' ').trim()`)
  const click = selector => js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('missing ${selector}'); e.click() })()`)
  const type = (selector, value) => js(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) throw new Error('missing ${selector}'); e.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), 'value').set.call(e, ${JSON.stringify(value)}); e.dispatchEvent(new Event('input', { bubbles: true })) })()`)
  const fits = async (name) => {
    const ok = await js('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')
    const culprits = ok ? '' : await js(`[...document.querySelectorAll('body *')].filter(e => !e.closest('dialog') && e.getBoundingClientRect().right > document.documentElement.clientWidth + 1).slice(0, 4).map(e => e.tagName.toLowerCase() + '.' + String(e.className).split(' ').slice(0, 3).join('.') + ' "' + e.innerText?.slice(0, 30) + '"').join(' | ')`)
    check(`${name}: nothing wider than the screen`, ok, culprits)
  }
  const answer = async (which) => { await click(which === 'yes' ? '.choice:not(.choice-no) input' : '.choice-no input'); }
  const submit = async () => { await click('.form-submit'); await until(`document.querySelector('.confirm')`) }

  console.log('\nGuest on a phone (390 wide), Hebrew')
  await size(390, 844)
  await open(path(guest.url))
  check('greets the guest by name', (await text('.hero-invite')).includes('דניאל כהן'))
  check('gate plate invites an answer', (await text('.gate-plate')) === 'אישור הגעה')
  check('gate rose is a bud before answering', await js(`getComputedStyle(document.querySelector('.gate .o-gate-rose')).fill === getComputedStyle(document.querySelector('.inv')).backgroundColor`))
  await fits('invitation, unanswered')

  await answer('yes')
  await until(`document.querySelector('.add-guest')`)
  await click('.add-guest')
  await until(`document.querySelector('.guest-rows input')`)
  await click('.form-submit')
  await sleep(200)
  check('an empty guest row is refused with an explanation, and nothing is sent', (await text('.form-error')).length > 0 && !(await js(`!!document.querySelector('.confirm')`)))
  await type('.guest-rows input', 'מאיה כהן')
  await submit()
  check('first answer (yes, with a guest) shows the confirmation at once', (await text('.confirm')).includes('נתראה בחתונה') && (await text('.confirm')).includes('מאיה כהן'), await text('.confirm'))
  check('gate plate now offers to change the answer', (await text('.gate-plate')) === 'עדכון התשובה', await text('.gate-plate'))
  check('gate rose blooms after yes', await js(`getComputedStyle(document.querySelector('.gate .o-gate-rose')).fill !== getComputedStyle(document.querySelector('.inv')).backgroundColor`))

  await click('.confirm-change'); await until(`document.querySelector('.form')`)
  await answer('no'); await submit()
  check('changing yes → no updates without a reload', (await text('.confirm')).includes('תודה שעדכנתם'), await text('.confirm'))

  await click('.confirm-change'); await until(`document.querySelector('.form')`)
  await answer('yes'); await submit()
  check('changing no → yes updates without a reload', (await text('.confirm')).includes('נתראה בחתונה'), await text('.confirm'))
  check('a guest removed by declining is not silently brought back', !(await text('.confirm')).includes('מאיה כהן'))

  await open(path(guest.url))
  check('the answer is still there after a reload', (await text('.confirm')).includes('נתראה בחתונה'))
  await fits('invitation, confirmed')

  await click('.hero-lang button')
  await until(`document.documentElement.lang !== 'he'`)
  check('switching language keeps the answer on screen', (await text('.confirm')).length > 0 && (await js('document.documentElement.dir')) === 'ltr')

  console.log('\nGuest who comes alone')
  await send('Network.clearBrowserCookies') // forget the language the previous guest chose
  await open(path(alone.url))
  await answer('yes'); await sleep(300)
  check('no way to add guests is offered', !(await js(`!!document.querySelector('.add-guest')`)))
  await submit()
  check('confirmation for one person', (await text('.confirm')).includes('נתראה בחתונה'))

  console.log('\nEnglish guest on a desktop (1440 wide)')
  await size(1440, 900)
  await open(path(english.url))
  check('page is English and left-to-right', (await js('document.documentElement.lang')) === 'en' && (await js('document.documentElement.dir')) === 'ltr')
  await answer('no'); await submit()
  check('declining shows the thank-you', (await text('.confirm')).includes('Thank you'))
  await fits('invitation, desktop')
  await open('/i/' + 'A'.repeat(43))
  check('an unknown link shows a plain notice, not an error page', (await text('h1')).length > 0 && !(await js(`!!document.querySelector('.form')`)))

  console.log('\nAdmin')
  await js(`fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: ${JSON.stringify(PASSWORD)} }) }).then(r => r.ok)`)
  await open('/admin/c/1')
  const table = await text('.list')
  check('guest list shows the answers just given', table.includes('דניאל כהן') && table.includes('Attending') && table.includes('Declined'))
  await fits('guest list, desktop')
  for (const tab of ['import', 'details', 'design', 'settings']) { await open(`/admin/c/1/${tab}`); await fits(`${tab} tab, desktop`) }
  await size(390, 844)
  for (const tab of ['', '/import', '/details', '/design', '/settings']) { await open(`/admin/c/1${tab}`); await fits(`${tab.slice(1) || 'guests'} tab, phone`) }
  await open('/admin'); await fits('campaigns list, phone')

  console.log('\nRecords')
  const list = (await api('GET', '/api/admin/c/1/invitations'))
  const daniel = list.invitations.find(i => i.id === guest.id)
  check('guest is recorded as attending alone, opened, with a response time', daniel.rsvpStatus === 'attending' && daniel.confirmedCount === 1 && !!daniel.firstOpenedAt && !!daniel.respondedAt, JSON.stringify(daniel))
  const history = (await api('GET', `/api/admin/c/1/invitations/${guest.id}/events`)).map(e => e.kind).reverse()
  check('history holds every step in order', JSON.stringify(history) === JSON.stringify(['created', 'opened', 'answered', 'answered', 'answered']), history.join(', '))
  check('counts add up', list.stats.accepted === 2 && list.stats.declined === 1 && list.stats.confirmedAttendees === 2 && list.stats.opened === 3, JSON.stringify(list.stats))

  await api('POST', '/api/admin/c/1/whatsapp/link')
  await api('POST', '/api/admin/c/1/whatsapp/send', { sender: 'own' })
  for (let i = 0; i < 50 && (await api('GET', '/api/admin/c/1/whatsapp')).progress.state === 'running'; i++) await sleep(100)
  const after = (await api('GET', '/api/admin/c/1/invitations')).invitations
  check('automatic sending marks only the guest with a phone number as sent', !!after.find(i => i.id === guest.id).sentAt && !after.find(i => i.id === alone.id).sentAt)
  check('the send is in the history', (await api('GET', `/api/admin/c/1/invitations/${guest.id}/events`))[0].kind === 'sent')

  check('no script errors in any page', problems.length === 0, problems.slice(0, 5).join('\n          '))
  ws.close()
}
catch (error) {
  failures++
  console.error('\n  FAIL  the run itself broke:', error.message)
}
finally { cleanup() }
console.log(failures ? `\n${failures} check(s) failed.` : '\nAll browser checks passed.')
process.exit(failures ? 1 : 0)
