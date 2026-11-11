/** Minimal RFC 4180 CSV reader/writer with the Excel accommodations this app needs. */

const BOM = '﻿'

/** Excel in some locales writes `;` or tab separated "CSV". Decide from the header line. */
function detectDelimiter(text: string): string {
  const header = text.split(/\r?\n/, 1)[0] ?? ''
  const counts = [',', ';', '\t'].map(d => [d, header.split(d).length - 1] as const)
  counts.sort((a, b) => b[1] - a[1])
  return counts[0]![1] > 0 ? counts[0]![0] : ','
}

/** Parse CSV text into rows of cells. Handles a BOM, quoted commas, escaped quotes, and line breaks inside quotes. */
export function parseCsv(input: string): string[][] {
  const text = input.startsWith(BOM) ? input.slice(1) : input
  const delimiter = detectDelimiter(text)
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  let i = 0
  const endCell = () => { row.push(cell); cell = '' }
  const endRow = () => { endCell(); rows.push(row); row = [] }

  while (i < text.length) {
    const ch = text[i]!
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i += 2; continue }
        quoted = false
      }
      else cell += ch
    }
    else if (ch === '"' && cell === '') quoted = true
    else if (ch === delimiter) endCell()
    else if (ch === '\n') endRow()
    else if (ch === '\r') { if (text[i + 1] !== '\n') endRow() }
    else cell += ch
    i++
  }
  if (cell !== '' || row.length) endRow()
  return rows
}

/**
 * Neutralise spreadsheet formula injection: a cell that would be evaluated
 * (=, +, -, @, tab, CR) gets a leading apostrophe so Excel and Sheets show it as text.
 */
export function safeCell(value: string | number | boolean | null | undefined): string {
  let text = value == null ? '' : String(value)
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Serialise rows as UTF-8 CSV with a BOM and CRLF line endings, which Excel opens with Hebrew intact. */
export function toCsv(header: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  return BOM + [header, ...rows].map(r => r.map(safeCell).join(',')).join('\r\n') + '\r\n'
}
