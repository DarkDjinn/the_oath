import type { EventHandlerRequest, H3Event } from 'h3'
import { isValidSession } from '../core/auth'
import { openDatabase, type DB } from '../core/db'
import { NotFoundError, ValidationError } from '../core/errors'
import { listInvitations, toAdmin, type InvitationRow } from '../core/invitations'

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

export function tokenSecret(): string {
  const secret = process.env.TOKEN_SECRET
  if (secret && secret.length >= 32) return secret
  if (import.meta.dev) return 'dev-only-token-secret-never-use-in-production'
  throw new Error('TOKEN_SECRET must be set to at least 32 random characters.')
}

/** Public origin used in invitation links. Set SITE_URL in production. */
export function siteUrl(event: H3Event): string {
  return process.env.SITE_URL || getRequestURL(event, { xForwardedHost: true, xForwardedProto: true }).origin
}

/** Guests send their invitation token in the Authorization header, which keeps it out of API URLs and logs. */
export function bearerToken(event: H3Event): string {
  return (getRequestHeader(event, 'authorization') ?? '').replace(/^Bearer\s+/i, '')
}

export function isAdmin(event: H3Event): boolean {
  return isValidSession(useDb(), getCookie(event, SESSION_COOKIE))
}

export function adminView(event: H3Event, row: InvitationRow) {
  return toAdmin(row, tokenSecret(), siteUrl(event))
}
export function allAdminViews(event: H3Event) {
  return listInvitations(useDb()).map(row => adminView(event, row))
}

export function invitationId(event: H3Event): number {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id < 1) throw createError({ statusCode: 404, message: 'Invitation not found.' })
  return id
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
