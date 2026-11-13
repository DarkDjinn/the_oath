import { diamond, fill, star, type Extra, type Options } from '../../draw'

/** Saffron Dunes: `horizon` is the great disc behind the names; `border` the loom threads down the sides. */
export const extra = (o: Options): Extra => {
  let back = ''
  if (o.horizon === 'weave') {
    for (let i = 0; i < 6; i++) back += diamond(186, 240, 300 - i * 48, 300 - i * 48, i % 2 ? 'var(--x8)' : 'var(--x7)')
  }
  if (o.horizon === 'stars') {
    // A crescent moon (outer arc round the left, inner arc back) among stars.
    back += `<path d="M196 116A124 124 0 0 0 196 364A160 160 0 0 1 196 116Z" ${fill('var(--x7)')}/>`
    for (const [x, y, r] of [[290, 150, 15], [322, 222, 10], [64, 150, 11], [84, 296, 9], [300, 300, 13], [250, 112, 8]] as const) back += star(x, y, r, 'var(--x7)', 5)
  }
  let front = ''
  if (o.border === 'woven') {
    for (const y of [40, 584]) for (let x = 0, k = 0; x < 375; x += 15, k++) front += `<rect x="${x}" y="${y}" width="15" height="12" fill="var(--x${3 + (k % 3)})"/>`
  }
  return { at: { horizon: back }, front }
}
