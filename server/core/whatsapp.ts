import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import type { LinkStatus } from '../../shared/types'
import { SenderUnavailable, type SenderKey, type Transport } from './sender'

/**
 * Linked WhatsApp accounts, through the Baileys library (the WhatsApp Web protocol).
 *
 * This is unofficial: WhatsApp does not sanction automated sending this way and
 * may restrict an account that looks like it is sending in bulk. The queue in
 * sender.ts paces messages for that reason. Each account's login lives in its
 * own folder under WHATSAPP_DIR and survives restarts.
 */

export const whatsappRoot = () => process.env.WHATSAPP_DIR || './data/whatsapp'
const folder = (key: SenderKey) => join(whatsappRoot(), key)
const hasLogin = (key: SenderKey) => existsSync(join(folder(key), 'creds.json'))

interface Session {
  status: LinkStatus
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket?: any
  /** Set while we want this account connected; cleared by unlink. */
  wanted: boolean
  retries: number
}
const sessions = new Map<SenderKey, Session>()

/** Baileys wants a pino-style logger; ours says nothing (its logs can contain message content and numbers). */
const quiet = { level: 'silent', child: () => quiet, trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {} }

async function open(key: SenderKey): Promise<void> {
  const session = sessions.get(key) ?? { status: { state: 'connecting' }, wanted: true, retries: 0 }
  session.wanted = true
  session.status = { state: 'connecting' }
  sessions.set(key, session)

  const baileys = await import('baileys')
  const { toString: qrSvg } = await import('qrcode')
  mkdirSync(folder(key), { recursive: true })
  const { state, saveCreds } = await baileys.useMultiFileAuthState(folder(key))
  const socket = baileys.makeWASocket({
    auth: state,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logger: quiet as any,
    browser: baileys.Browsers.macOS('Desktop'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
  })
  session.socket = socket
  socket.ev.on('creds.update', saveCreds)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.ev.on('connection.update', async (update: any) => {
    if (sessions.get(key)?.socket !== socket) return // a newer connection replaced this one
    if (update.qr) {
      // Drawn the way WhatsApp Web draws its own code: lowest error correction (fewest, largest squares),
      // a full quiet zone, and as a vector so every square stays sharp at any size. A small, blurry code
      // is read by a phone's camera app but not by WhatsApp's own scanner.
      const svg = await qrSvg(update.qr, { type: 'svg', errorCorrectionLevel: 'L', margin: 4, color: { dark: '#000000', light: '#ffffff' } })
      session.status = { state: 'pairing', qr: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` }
    }
    if (update.connection === 'open') {
      session.retries = 0
      session.status = { state: 'linked', number: String(socket.user?.id ?? '').split(/[:@]/)[0] }
    }
    if (update.connection === 'close') {
      const code = update.lastDisconnect?.error?.output?.statusCode
      session.socket = undefined
      if (code === baileys.DisconnectReason.loggedOut) return forget(key) // unlinked from the phone
      // Reconnect only an account that has finished pairing; an unscanned QR code simply expires.
      if (session.wanted && hasLogin(key) && session.retries < 8) {
        session.status = { state: 'connecting' }
        setTimeout(() => { if (session.wanted) void openSafely(key) }, Math.min(30_000, 1500 * 2 ** session.retries++))
      }
      else {
        session.wanted = false
        session.status = { state: 'unlinked' }
        if (!hasLogin(key)) rmSync(folder(key), { recursive: true, force: true })
      }
    }
  })
}

/**
 * Open a connection without ever leaving the account stuck on "connecting":
 * a linked account is retried, an unlinked one goes back to "unlinked".
 */
function openSafely(key: SenderKey): Promise<void> {
  return open(key).catch((error) => {
    console.error('[whatsapp] could not connect:', error instanceof Error ? error.message : error)
    const session = sessions.get(key)
    if (!session) return
    session.socket = undefined
    if (session.wanted && hasLogin(key)) setTimeout(() => { if (session.wanted) void openSafely(key) }, 30_000)
    else { session.wanted = false; session.status = { state: 'unlinked' } }
  })
}

function forget(key: SenderKey): void {
  const session = sessions.get(key)
  if (session) {
    session.wanted = false
    session.status = { state: 'unlinked' }
    try { session.socket?.end(undefined) }
    catch { /* already closed */ }
    session.socket = undefined
  }
  rmSync(folder(key), { recursive: true, force: true })
}

export const whatsapp: Transport & {
  link(key: SenderKey): Promise<LinkStatus>
  unlink(key: SenderKey): Promise<void>
  restore(): void
  shutdown(): void
} = {
  status(key) {
    const session = sessions.get(key)
    if (session) return session.status
    if (!hasLogin(key)) return { state: 'unlinked' }
    // Linked before this process started: reconnect in the background.
    void openSafely(key)
    return { state: 'connecting' }
  },

  /** Start linking: the status then carries a QR code until the phone scans it. */
  async link(key) {
    const current = this.status(key)
    if (current.state !== 'unlinked') return current
    await openSafely(key)
    return this.status(key)
  },

  /** Sign the account out on WhatsApp's side too, and delete its login. */
  async unlink(key) {
    const socket = sessions.get(key)?.socket
    try { await socket?.logout() }
    catch { /* not connected: deleting the login is enough */ }
    forget(key)
  },

  async send(key, phone, text) {
    const session = sessions.get(key)
    if (session?.status.state !== 'linked' || !session.socket) throw new SenderUnavailable('The WhatsApp account is not connected. Link it again and send the rest.')
    const digits = phone.replace(/\D/g, '')
    let found: { jid: string, exists: unknown } | undefined
    try { [found] = (await session.socket.onWhatsApp(`${digits}@s.whatsapp.net`)) ?? [] }
    catch { throw new SenderUnavailable('WhatsApp did not answer. Check the linked phone is online and send the rest.') }
    if (!found?.exists) throw new Error('This number is not on WhatsApp.')
    await session.socket.sendMessage(found.jid, { text })
  },

  /** Reconnect every account that was linked before a restart. */
  restore() {
    let keys: string[]
    try { keys = readdirSync(whatsappRoot()) }
    catch { return }
    for (const key of keys) if (/^(platform|campaign-\d+)$/.test(key) && hasLogin(key as SenderKey)) void openSafely(key as SenderKey)
  },

  shutdown() {
    for (const session of sessions.values()) {
      session.wanted = false
      try { session.socket?.end(undefined) }
      catch { /* already closed */ }
    }
  },
}

/** A stand-in for tests (`WHATSAPP_TRANSPORT=fake`): links instantly, "sends" without any network. */
export function fakeTransport(): typeof whatsapp & { outbox: { key: SenderKey, phone: string, text: string }[] } {
  const linked = new Set<SenderKey>()
  const outbox: { key: SenderKey, phone: string, text: string }[] = []
  return {
    outbox,
    status: key => (linked.has(key) ? { state: 'linked', number: '972500000000' } : { state: 'unlinked' }),
    async link(key) { linked.add(key); return this.status(key) },
    async unlink(key) { linked.delete(key) },
    async send(key, phone, text) {
      if (!linked.has(key)) throw new SenderUnavailable('The WhatsApp account is not connected. Link it again and send the rest.')
      if (phone.endsWith('0000')) throw new Error('This number is not on WhatsApp.')
      outbox.push({ key, phone, text })
    },
    restore() {},
    shutdown() {},
  }
}
