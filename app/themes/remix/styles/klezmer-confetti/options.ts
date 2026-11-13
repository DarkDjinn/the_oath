import { circle, fill, line, note, squiggle, type Extra, type Options } from '../../draw'

/**
 * Klezmer Confetti: `instrument` is the great instrument (the drawn violin, a clarinet or an
 * accordion); `confetti` what flies around it (ribbon curls, notes, or dots).
 */
const bits = [[67, 98, 30], [151, 240, 27], [51, 347, 28], [330, 52, 15]] as const
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.instrument === 'clarinet') {
    at.instrument = `<g transform="rotate(-58 268 196)"><rect x="140" y="182" width="230" height="28" rx="10" ${fill('var(--x5)')}/><path d="M370 178L410 160V232L370 214Z" ${fill('var(--x5)')}/><path d="M110 188H140V204H110Z" ${fill('var(--x6)')}/>`
      + [170, 200, 230, 260, 290, 320].map(x => circle(x, 196, 6, fill('var(--x8)'))).join('') + `<path d="M150 182H370" ${line('var(--x7)', 2)}/></g>`
  }
  if (o.instrument === 'accordion') {
    let z = 'M210 120'
    for (let i = 0; i < 8; i++) z += `L${226 + i * 14} ${i % 2 ? 120 : 270}`
    at.instrument = `<rect x="170" y="110" width="44" height="172" rx="8" ${fill('var(--x5)')}/><rect x="320" y="110" width="44" height="172" rx="8" ${fill('var(--x5)')}/><path d="M214 120H320V272H214Z" ${fill('var(--x6)')}/><path d="${z}" ${line('var(--x7)', 3)}/>`
      + [130, 154, 178, 202, 226, 250].map(y => `<rect x="180" y="${y}" width="24" height="12" rx="3" ${fill('var(--color-plate)')}/>` + circle(342, y + 6, 6, fill('var(--x8)'))).join('')
  }
  if (o.confetti === 'ribbons') at.confetti = bits.map(([x, y, r], i) => `<g transform="rotate(${i * 40 - 30} ${x} ${y})">${squiggle(x - r, y, r * 2, r * 0.28, 'var(--x10)', Math.max(4, r * 0.22))}</g>`).join('')
  if (o.confetti === 'notes') at.confetti = bits.map(([x, y, r]) => note(x, y + r * 0.4, r / 26, 'var(--x10)')).join('')
  if (o.confetti === 'dots') at.confetti = bits.map(([x, y, r]) => circle(x, y, r * 0.42, fill('var(--x10)')) + circle(x + r * 0.7, y - r * 0.6, r * 0.18, fill('var(--x10)'))).join('')
  return { at }
}
