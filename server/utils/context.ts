import type { EventHandlerRequest, H3Event } from 'h3'
import type { SessionInfo } from '#shared/campaign'
import { canAccess, getSession, type Session } from '../core/auth'
import { contentOf, getCampaign, getCampaignBySlug, toAdminCampaign, toPublic, type CampaignRow } from '../core/campaigns'
import { openDatabase, type DB } from '../core/db'
import { NotFoundError, ValidationError } from '../core/errors'
import { listInvitations, toAdmin, type InvitationRow } from '../core/invitations'
import { findPhotos } from '../core/photos'
import { SendQueue, type SenderKey } from '../core/sender'
import { fakeTransport, whatsapp } from '../core/whatsapp'

export const SESSION_COOKIE = 'oath_admin'

let db: DB | undefined
export function useDb(): DB {
  db ??= openDatabase(process.env.DATABASE_PATH || './data/wedding.db')
  return db
}
export function closeDb(): void {
  db?.close()
  db = undefined
}

// ---------------------------------------------------------------- WhatsApp

/** The linked-account layer: the real library, or a stand-in when WHATSAPP_TRANSPORT=fake (tests). */
let transport: typeof whatsapp | undefined
export function useWhatsapp() {
  transport ??= process.env.WHATSAPP_TRANSPORT === 'fake' ? fakeTransport() : whatsapp
  return transport
}

let queue: SendQueue | undefined
/** Paced sending. Defaults: 20 to 40 seconds between messages, 150 a day per account. */
export function useSendQueue(): SendQueue {
  queue ??= new SendQueue(useDb(), useWhatsapp(), {
    minGapMs: Number(process.env.WHATSAPP_MIN_GAP_MS ?? 20_000),
    maxGapMs: Number(process.env.WHATSAPP_MAX_GAP_MS ?? 40_000),
    dailyCap: Number(process.env.WHATSAPP_DAILY_CAP ?? 150),
  })
  return queue
}
export const ownSender = (campaignId: number): SenderKey => `campaign-${campaignId}`

export function tokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (secret && secret.length >= 32) return secret
  if (import.meta.dev) return 'dev-only-token-secret-never-use-in-production'
  throw new Error('TOKEN_SECRET must be set to at least 32 random characters.')
}

// ------------------------------------------------------------- addresses

/** The platform's own origin (owner panel). Set SITE_URL in production. */
export function siteUrl(event: H3Event): string {
  return (process.env.SITE_URL || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin).replace(/\/+$/, '')
}

/** Host under which each campaign gets `<slug>.<BASE_DOMAIN>`, e.g. `wedding-example.duckdns.org`. Empty disables subdomains. */
export const baseDomain = () => (process.env.BASE_DOMAIN || '').trim().toLowerCase().replace(/^\.+|\.+$/g, '')

export const requestHost = (event: H3Event) => (getRequestHeader(event, 'x-forwarded-host') || getRequestHeader(event, 'host') || '').toLowerCase()

/** A campaign's own site address: its subdomain when BASE_DOMAIN is set, otherwise a path on the platform. */
export function campaignUrl(event: H3Event, row: Pick<CampaignRow, 'slug'>): string {
  const base = baseDomain()
  if (!base) return `${siteUrl(event)}/w/${row.slug}`
  const scheme = new URL(siteUrl(event)).protocol
  return `${scheme}//${row.slug}.${base}`
}
/** Where a campaign's personal links start. With subdomains: `<slug>.<base>`; without: the platform origin. */
export const linkBase = (event: H3Event, row: Pick<CampaignRow, 'slug'>) => (baseDomain() ? campaignUrl(event, row) : siteUrl(event))

/** The campaign whose subdomain this request came in on, if any. */
export function campaignFromHost(event: H3Event): CampaignRow | null {
  const base = baseDomain(), host = requestHost(event)
  if (!base || !host.endsWith(`.${base}`)) return null
  const label = host.slice(0, -base.length - 1)
  return label.includes('.') ? null : getCampaignBySlug(useDb(), label)
}

/**
 * With subdomains, the admin session cookie is shared with every campaign subdomain,
 * so a signed-in admin can preview a draft at its real address. Not on localhost,
 * where browsers handle a cookie Domain unreliably.
 */
export function cookieDomain(): string | undefined {
  const host = baseDomain().split(':')[0] ?? ''
  return host && host !== 'localhost' && !host.endsWith('.localhost') && !/^[\d.]+$/.test(host) ? host : undefined
}

/** Where an admin should look at a campaign: its own address, or the path fallback for a draft the cookie cannot reach. */
export function previewUrl(event: H3Event, row: Pick<CampaignRow, 'slug' | 'status'>): string {
  return row.status !== 'draft' || cookieDomain() ? campaignUrl(event, row) : `/w/${row.slug}`
}

// ---------------------------------------------------------------- sessions

export const sessionOf = (event: H3Event): Session | null => getSession(useDb(), getCookie(event, SESSION_COOKIE))
export const isAdmin = (event: H3Event): boolean => sessionOf(event) !== null
export function sessionInfo(event: H3Event): SessionInfo {
  const s = sessionOf(event)
  return { authenticated: !!s, role: s?.role ?? null, campaignId: s?.campaignId ?? null }
}

export function requireOwner(event: H3Event): void {
  if (sessionOf(event)?.role !== 'owner') throw createError({ statusCode: 403, message: 'Only the owner can do this.', data: { code: 'forbidden' } })
}

/**
 * The campaign named in the route, after checking this session may act on it.
 * A couple asking for someone else's campaign gets the same 404 as a campaign that does not exist.
 */
export function requireCampaign(event: H3Event): CampaignRow {
  const id = Number(getRouterParam(event, 'cid'))
  const notFound = createError({ statusCode: 404, message: 'Campaign not found.', data: { code: 'not_found' } })
  if (!Number.isInteger(id) || id < 1 || !canAccess(sessionOf(event), id)) throw notFound
  try { return getCampaign(useDb(), id) }
  catch { throw notFound }
}

// ------------------------------------------------------------------- views

export const publicView = (row: CampaignRow) => toPublic(row, findPhotos(row.id))
export const adminCampaignView = (event: H3Event, row: CampaignRow) => ({ ...toAdminCampaign(row, findPhotos(row.id), campaignUrl(event, row)), previewUrl: previewUrl(event, row) })

export function adminView(event: H3Event, campaign: CampaignRow, row: InvitationRow) {
  return toAdmin(row, tokenSecret(), linkBase(event, campaign), contentOf(campaign).rsvp.guestLimit)
}
export function allAdminViews(event: H3Event, campaign: CampaignRow) {
  return listInvitations(useDb(), campaign.id).map(row => adminView(event, campaign, row))
}

export function invitationId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 404, message: 'Invitation not found.' })
  return id
}

/** Guests send their invitation token in the Authorization header, which keeps it out of API URLs and logs. */
export function bearerToken(event: H3Event): string {
  return (getRequestHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '')
}

/**
 * Wraps a handler so every API error has the same shape:
 * `{ statusCode, message, data: { code } }`. Unknown errors become a plain 500
 * and are logged without request details (URLs may carry invitation tokens).
 */
export function apiHandler<T>(handler: (event: H3Event<EventHandlerRequest>) => T | Promise<T>) {
  return defineEventHandler(async (event) => {
    try {
      return await handler(event)
    }
    catch (error) {
      if (error instanceof ValidationError) throw createError({ statusCode: 400, message: error.message, data: { code: error.code } })
      if (error instanceof NotFoundError) throw createError({ statusCode: 404, message: error.message, data: { code: 'not_found' } })
      if (isError(error)) throw error
      console.error('[api] unexpected error:', error instanceof Error ? error.stack : error)
      throw createError({ statusCode: 500, message: 'Something went wrong. Please try again.', data: { code: 'internal' } })
    }
  })
}
