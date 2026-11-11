import type { ImportPreview, ImportRow, Language } from '../../shared/types'
import { LIMITS, MAX_EXTRA_GUESTS } from '../../shared/types'
import { parseCsv } from './csv'
import type { DB } from './db'
import { ValidationError } from './errors'
import { cleanText, createInvitation, listInvitations, type InvitationRow } from './invitations'

export const IMPORT_MAX_ROWS = 2000
export const IMPORT_TEMPLATE_HEADER = ['name', 'plus_one_allowed', 'language']

const NAME_HEADERS = ['name', 'guest_name', 'guest', 'שם']
const GUESTS_HEADERS = ['plus_one_allowed', 'guests_allowed', 'plus_one']
const LANGUAGE_HEADERS = ['language', 'lang', 'שפה']
const TRUE = new Set(['true', '1', 'yes', 'y', 'כן'])
const FALSE = new Set(['false', '0', 'no', 'n', 'לא', ''])

const normaliseHeader = (h: string) => cleanText(h).toLowerCase().replace(/[\s-]+/g, '_')
/** Names are compared loosely for duplicate *warnings* only. They are never treated as identifiers. */
const nameKey = (name: string) => name.toLowerCase().replace(/\s+/g, ' ')

/**
 * Parse and validate a CSV without touching the database.
 * One CSV row is one invitation. Row numbers are spreadsheet rows (the header is row 1).
 */
export function buildPreview(csv: string, existingNames: string[]): ImportPreview {
  const preview: ImportPreview = { rows: [], fileErrors: [], totals: { rows: 0, valid: 0, withGuestsAllowed: 0, errors: 0, warnings: 0 } }
  const table = parseCsv(csv)
  const header = (table[0] ?? []).map(normaliseHeader)
  const nameCol = header.findIndex(h => NAME_HEADERS.includes(h))
  const guestsCol = header.findIndex(h => GUESTS_HEADERS.includes(h))
  const langCol = header.findIndex(h => LANGUAGE_HEADERS.includes(h))

  if (!table.length) preview.fileErrors.push('The file is empty.')
  else if (nameCol === -1) preview.fileErrors.push('The first row must be a header containing a "name" column. Download the template to see the expected format.')
  if (table.length - 1 > IMPORT_MAX_ROWS) preview.fileErrors.push(`The file has more than ${IMPORT_MAX_ROWS} rows.`)
  if (preview.fileErrors.length) return preview

  const existing = new Set(existingNames.map(nameKey))
  const firstSeen = new Map<string, number>()

  table.slice(1).forEach((cells, index) => {
    const rowNumber = index + 2
    if (cells.every(c => cleanText(c) === '')) return // blank spreadsheet line

    const row: ImportRow = { row: rowNumber, name: cleanText(cells[nameCol]), guestsAllowed: false, guestLimit: null, language: 'he', errors: [], warnings: [] }

    if (!row.name) row.errors.push('The name is empty.')
    else if (row.name.length > LIMITS.name) row.errors.push(`The name is longer than ${LIMITS.name} characters.`)

    const guests = cleanText(cells[guestsCol]).toLowerCase()
    if (TRUE.has(guests) && guests !== '1') row.guestsAllowed = true
    else if (/^\d+$/.test(guests)) {
      // A number is that invitee's own limit: 0 none, 1 a plus-one, 4 a family, and so on.
      const n = Number(guests)
      if (n > MAX_EXTRA_GUESTS) row.errors.push(`plus_one_allowed can be at most ${MAX_EXTRA_GUESTS}, found ${n}.`)
      else if (n > 0) { row.guestsAllowed = true; row.guestLimit = n }
    }
    else if (!FALSE.has(guests)) row.errors.push(`plus_one_allowed must be true, false or a number, found "${cleanText(cells[guestsCol])}".`)

    const lang = cleanText(cells[langCol]).toLowerCase()
    if (lang === 'en' || lang === 'he') row.language = lang as Language
    else if (lang !== '') row.errors.push(`language must be he or en, found "${cleanText(cells[langCol])}".`)

    if (row.name) {
      const key = nameKey(row.name)
      const earlier = firstSeen.get(key)
      if (earlier) row.warnings.push(`Same name as row ${earlier}. Both will be imported as separate invitations unless you untick one.`)
      else firstSeen.set(key, rowNumber)
      if (existing.has(key)) row.warnings.push('An invitation with this name already exists. Importing adds a second, separate invitation.')
    }
    preview.rows.push(row)
  })

  if (!preview.rows.length) preview.fileErrors.push('The file has a header but no guest rows.')
  for (const row of preview.rows) {
    if (row.errors.length) preview.totals.errors++
    else {
      preview.totals.valid++
      if (row.guestsAllowed) preview.totals.withGuestsAllowed++
    }
    if (row.warnings.length) preview.totals.warnings++
  }
  preview.totals.rows = preview.rows.length
  return preview
}

/**
 * Import-only: every included row becomes a new invitation in this campaign. Existing invitations
 * and their RSVPs are never modified. The whole file is validated first and
 * inserted in one transaction, so an import either fully happens or not at all.
 */
export function commitImport(db: DB, secret: string, campaignId: number, csv: string, excludedRows: number[] = []): InvitationRow[] {
  const preview = buildPreview(csv, listInvitations(db, campaignId).map(r => r.guest_name))
  if (preview.fileErrors.length) throw new ValidationError('import_invalid', preview.fileErrors[0]!)
  const excluded = new Set(excludedRows)
  const included = preview.rows.filter(r => !excluded.has(r.row))
  const bad = included.filter(r => r.errors.length)
  if (bad.length) {
    throw new ValidationError('import_invalid', `Row ${bad[0]!.row}: ${bad[0]!.errors[0]} Fix or untick ${bad.length === 1 ? 'this row' : `the ${bad.length} rows with errors`} and try again.`)
  }
  if (!included.length) throw new ValidationError('import_empty', 'No rows are selected for import.')
  return db.transaction(() =>
    included.map(r => createInvitation(db, secret, campaignId, { guestName: r.name, guestsAllowed: r.guestsAllowed, guestLimit: r.guestLimit, language: r.language })),
  )()
}
