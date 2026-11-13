import { comet, sparkle, type Extra, type Options } from '../../draw'

/**
 * Firework Finale: `burst` is the kind of firework (radiating starbursts as drawn, comets
 * climbing to each burst, or clouds of sparkles); `skyline` the city below (as drawn, rolling
 * hills, or open sky).
 */
const bursts = [[87, 85, 61, 'var(--x0)'], [285, 100, 72, 'var(--x2)'], [187, 300, 105, 'var(--x3)'], [360, 320, 36, 'var(--x4)']] as const
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.burst === 'comets') at.rays = bursts.map(([x, y, r, c], i) => comet(x, y, r * 1.6, i % 2 ? -60 : -120, c, c)).join('')
  if (o.burst === 'sparkles') {
    at.rays = bursts.map(([x, y, r, c]) => [0, 60, 120, 180, 240, 300].map((a, k) => sparkle(x + r * 0.7 * Math.cos((a + 15) * Math.PI / 180), y + r * 0.7 * Math.sin((a + 15) * Math.PI / 180), r * (k % 2 ? 0.16 : 0.22), c)).join('') + sparkle(x, y, r * 0.3, c)).join('')
  }
  if (o.skyline === 'hills') at.skyline = '<path d="M0 430V380C60 350 120 352 180 372S300 356 375 368V430Z" fill="var(--x5)"/>'
  return { at }
}
