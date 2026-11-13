import { circle, fill, line, star, type Extra, type Options } from '../../draw'

/**
 * Confetti Couture: `ribbons` is the sculpted centrepiece (the drawn bow, looping ribbon, or
 * falling streamers); `confetti` the shapes around it (discs, diamonds as drawn, or stars).
 */
const bits = [[42, 199, 13, 'var(--x7)'], [336, 328, 18, 'var(--x8)'], [66, 377, 12, 'var(--x9)'], [318, 143, 14, 'var(--x10)']] as const
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.ribbons === 'loops') {
    const d = 'M20 300C60 120 150 120 140 230S70 330 120 340 240 120 250 230 200 340 250 330 360 180 355 140'
    at.ribbons = `<path d="${d}" ${line('var(--x3)', 22)}/><path d="${d}" ${line('var(--x5)', 8)}/>`
  }
  if (o.ribbons === 'streamers') {
    at.ribbons = [[70, 'var(--x3)'], [140, 'var(--x5)'], [210, 'var(--x3)'], [280, 'var(--x5)']].map(([x, c], i) => `<path d="M${x} 80c30 40 -30 70 0 110s-30 70 0 110 -20 50 ${i % 2 ? 10 : -10} 70" ${line(c as string, 12)}/>`).join('')
  }
  if (o.confetti === 'discs') at.confetti = bits.map(([x, y, r, c]) => circle(x, y, r, fill(c))).join('')
  if (o.confetti === 'stars') at.confetti = bits.map(([x, y, r, c]) => star(x, y, r * 1.3, c, 5)).join('')
  return { at }
}
