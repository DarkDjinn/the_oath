import { ValidationError } from './errors'

/**
 * Normalise a phone number to international form, e.g. "+972541234567".
 * Local Israeli numbers ("054-123 4567") get the country code; numbers already
 * written internationally ("+44…", "0044…", "972…") are kept. Empty stays empty.
 */
export function normalisePhone(input: unknown, country = '972'): string {
  if (input == null || input === '') return ''
  if (typeof input !== 'string' && typeof input !== 'number') throw new ValidationError('phone_invalid', 'That phone number is not valid.')
  // Spreadsheets (and our own exports) mark a number as text with a leading apostrophe.
  const raw = String(input).trim().replace(/^'/, '')
  if (!raw) return ''
  if (/[^\d\s().+\-‑–]/.test(raw)) throw new ValidationError('phone_invalid', `"${raw}" is not a phone number.`)
  let digits = raw.replace(/\D/g, '')
  if (raw.startsWith('+')) { /* already international */ }
  else if (digits.startsWith('00')) digits = digits.slice(2)
  else if (digits.startsWith('0')) digits = country + digits.slice(1)
  else if (!(digits.startsWith(country) && digits.length >= country.length + 8)) digits = country + digits
  if (digits.length < 9 || digits.length > 15) throw new ValidationError('phone_invalid', `"${raw}" does not look like a complete phone number.`)
  return `+${digits}`
}
