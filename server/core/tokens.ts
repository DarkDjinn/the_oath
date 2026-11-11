import { createHash, createHmac, randomBytes } from 'node:crypto'

/**
 * Invitation tokens are derived, not stored:
 *   token = HMAC-SHA256(TOKEN_SECRET, nonce)   (256 bits, base64url, 43 chars)
 * The database keeps the random nonce and a SHA-256 hash of the token.
 * The hash is what incoming links are looked up by; the nonce lets the admin
 * dashboard re-display a link. A leaked database or backup therefore does not
 * reveal any working link without TOKEN_SECRET.
 */
export function newNonce(): string {
  return randomBytes(16).toString('base64url')
}

export function deriveToken(secret: string, nonce: string): string {
  return createHmac('sha256', secret).update(nonce).digest('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/
export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && TOKEN_SHAPE.test(value)
}
