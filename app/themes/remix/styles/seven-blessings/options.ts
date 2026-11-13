import { circle, fill, star, type Extra, type Options } from '../../draw'

/**
 * Seven Blessings: `medallions` is what fills each of the seven jewels (rosettes as drawn,
 * cut facets, or stars); `border` the great ring around them (jewelled as drawn, beads, none).
 */
const centres = [[187, 76], [296, 128], [323, 246], [247, 340], [127, 340], [52, 246], [78, 128]] as const
const tones = ['var(--x6)', 'var(--x10)', 'var(--x11)', 'var(--x12)', 'var(--x13)', 'var(--x14)', 'var(--x15)']
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.medallions === 'facets') {
    at.medallions = centres.map(([x, y], i) => {
      const p = Array.from({ length: 8 }, (_, k) => `${(x + 27 * Math.cos((k * 45 + 22.5) * Math.PI / 180)).toFixed(1)} ${(y + 27 * Math.sin((k * 45 + 22.5) * Math.PI / 180)).toFixed(1)}`)
      return `<path d="M${p.join('L')}Z" ${fill(tones[i]!)}/><path d="M${x - 14} ${y - 6}H${x + 14}L${x} ${y + 16}ZM${x - 14} ${y - 6}L${x} ${y - 20}L${x + 14} ${y - 6}" fill="none" stroke="var(--color-plate)" stroke-width="1.6" opacity="0.8"/>`
    }).join('')
  }
  if (o.medallions === 'stars') at.medallions = centres.map(([x, y], i) => star(x, y, 27, tones[i]!, 8, 0.5) + circle(x, y, 6, fill('var(--x7)'))).join('')
  if (o.border === 'beads') {
    let b = ''
    for (let a = 0; a < 360; a += 6) b += circle(187 + 176 * Math.cos(a * Math.PI / 180), 215 + 176 * Math.sin(a * Math.PI / 180), a % 18 ? 3 : 5, fill('var(--x3)'))
    at.border = b
  }
  return { at }
}
