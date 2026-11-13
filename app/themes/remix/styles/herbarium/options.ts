import { daisy, line, type Extra, type Options } from '../../draw'

/**
 * Herbarium: `specimen` is the pressed sprig in the folio (the drawn round-leaved sprigs by
 * the label are eucalyptus; lavender and chamomile are pressed at the top corners); `margin` is the folio's ruling (journal lines as drawn,
 * open paper, or a catalogue grid).
 */
const sprig = (x: number, kind: string) => {
  // At the top corners of the folio, clear of the name label (which is the title's own panel).
  const stem = `<path d="M${x} 128C${x - 2} 100 ${x + 2} 70 ${x} 44" ${line('var(--x14)', 2.5)}/>`
  if (kind === 'lavender') {
    let buds = ''
    for (let i = 0; i < 9; i++) buds += `<ellipse cx="${x + (i % 2 ? 3 : -3)}" cy="${46 + i * 6}" rx="3.6" ry="5.5" fill="var(--x11)"/>`
    return stem + buds
  }
  return stem + `<path d="M${x} 100L${x - 11} 86M${x} 84L${x + 11} 72" ${line('var(--x14)', 2)}/>`
    + daisy(x, 42, 10, 'var(--color-plate)', 'var(--x10)', 12) + daisy(x - 12, 82, 7, 'var(--color-plate)', 'var(--x10)', 10) + daisy(x + 12, 68, 7, 'var(--color-plate)', 'var(--x10)', 10)
}
export const extra = (o: Options): Extra => {
  let front = ''
  let back = ''
  if (o.specimen === 'lavender' || o.specimen === 'chamomile') front += sprig(56, o.specimen) + sprig(320, o.specimen)
  if (o.margin === 'catalogue') {
    let d = ''
    for (let y = 60; y <= 560; y += 28) d += `M42 ${y}H344`
    for (let x = 70; x <= 330; x += 28) d += `M${x} 40V572`
    back += `<path d="${d}" ${line('var(--x5)', 1)} opacity="0.8"/>`
  }
  return { front, at: { margin: back } }
}
