import { flower, leaf, line, pomegranate, type Extra, type Options } from '../../draw'

/**
 * Rimon Fiesta: `tiles` is the pattern of the two mosaic bands (diamonds as drawn, flowers,
 * Moorish arches); `fruit` the hero (the two great pomegranates as drawn, a fruiting branch,
 * or an eight-point tile star alone).
 */
const band = (y: number, h: number, kind: string) => {
  let s = `<rect x="0" y="${y}" width="375" height="${h}" fill="var(--color-wine)"/>`
  if (kind === 'flowers') for (let x = 18; x < 375; x += 36) for (let r = 0; r * 36 + 18 < h; r++) s += flower(x + (r % 2 ? 18 : 0), y + 18 + r * 36, 15, r % 2 ? 'var(--color-gold)' : 'var(--color-plate)', 'var(--x7)', 6)
  if (kind === 'arches') {
    let d = ''
    for (let x = 0; x < 375; x += 30) for (let top = y + 10; top < y + h; top += 40) d += `M${x + 4} ${top + 30}V${top + 14}A11 11 0 0 1 ${x + 26} ${top + 14}V${top + 30}`
    s += `<path d="${d}" ${line('var(--color-gold)', 3)}/>`
  }
  return s
}
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.tiles === 'flowers' || o.tiles === 'arches') at.tiles = band(0, 104, o.tiles) + band(350, 80, o.tiles)
  if (o.fruit === 'branches') {
    at.fruit = `<path d="M10 300C90 160 280 160 365 290" ${line('var(--x4)', 6)}/>`
      + [[60, 236, -60], [130, 196, -100], [245, 196, -80], [318, 236, -120], [188, 180, -90]].map(([x, y, d]) => leaf(x!, y!, 34, 14, d!, 'var(--x6)')).join('')
      + [[95, 236], [187, 222], [280, 236]].map(([x, y]) => pomegranate(x!, y! + 20, 1.5, 'var(--x3)', 'var(--x5)', 'var(--x7)')).join('')
  }
  if (o.fruit === 'none') {
    at.fruit = `<rect x="122" y="150" width="130" height="130" fill="var(--x3)" transform="rotate(45 187 215)"/><rect x="122" y="150" width="130" height="130" fill="var(--x5)"/>` + flower(187, 215, 46, 'var(--x7)', 'var(--x4)', 8)
  }
  return { at }
}
