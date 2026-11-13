import { balloon, bodyBit, squiggle, star, type Extra, type Options } from '../../draw'

/** Happy Accident: `doodles` (balloons, stars or squiggles) bounce down the margins beside the sections; `density` is how many. */
const spots = [[4, 'end', -8], [12, 'start', 6], [22, 'end', 10], [30, 'start', -6], [40, 'end', 4], [48, 'start', 12], [58, 'end', -10], [66, 'start', 8], [76, 'end', 6], [86, 'start', -4], [92, 'end', 12], [96, 'start', -8]] as const
const colours = ['var(--color-gold)', 'var(--color-wine)', 'var(--x16)', 'var(--x13)']
export const extra = (o: Options): Extra => {
  const count = o.density === 'lively' ? 12 : o.density === 'medium' ? 8 : 4
  const body = spots.slice(0, count).map(([top, side, tilt], i) => {
    const c = colours[i % colours.length]!
    if (o.doodles === 'balloons') return bodyBit(top, side, 22, '-12 -14 24 50', balloon(0, 0, 11, c, 'var(--color-ivory)'), tilt)
    if (o.doodles === 'squiggles') return bodyBit(top, side, 26, '0 -8 60 16', squiggle(0, 0, 60, 7, c, 5), tilt * 3)
    return bodyBit(top, side, 18, '-12 -12 24 24', star(0, 0, 11, c, 5), tilt)
  }).join('')
  return { body }
}
