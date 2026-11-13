import { circle, fill, line, type Extra, type Options } from '../../draw'

/**
 * Gala Glow: `chandelier` is the light over the stage (the drawn crystal swags with their
 * bulbs, glowing orbs on the same swags, or a tiered chandelier); `drapery` the velvet (side
 * curtains as drawn, swags across the top, or a clean stage).
 */
const swag = (y0: number, y1: number, x0: number, x1: number) => (t: number) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * 4 * t * (1 - t)] as const
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.chandelier === 'orb') {
    at.bulbs = [swag(14, 70, 9, 366), swag(28, 90, 22, 353)].flatMap((f, k) => [0.08, 0.22, 0.36, 0.5, 0.64, 0.78, 0.92].map((t) => {
      const [x, y] = f(t)
      return circle(x, y + 8, 11, fill('var(--x12)') + ' opacity="0.25"') + circle(x, y + 8, k ? 5.5 : 6.5, fill('var(--x12)'))
    })).join('')
  }
  if (o.chandelier === 'tiered') {
    // Hung low, between the tag line and the stage, so it never crowds the text.
    let c = `<path d="M187 44V68" ${line('var(--x12)', 2)}/>`
    for (const [y, w] of [[76, 30], [98, 52], [120, 74]] as const) {
      c += `<path d="M${187 - w} ${y}Q187 ${y + 18} ${187 + w} ${y}" ${line('var(--x12)', 2.5)}/>`
      for (let k = -2; k <= 2; k++) c += `<path d="M${187 + (k * w) / 2} ${y - 2}v-8" ${line('var(--x12)', 2.5)}/>` + circle(187 + (k * w) / 2, y - 12, 3, fill('var(--x13)'))
    }
    at.bulbs = c
  }
  if (o.drapery === 'swags') {
    let d = 'M0 0H375V18'
    for (let x = 375; x > 0; x -= 75) d += `Q${x - 37.5} 74 ${x - 75} 18`
    at.drapery = `<path d="${d}Z" fill="url(#gala-glow-velvet)"/><path d="M0 18${[0, 75, 150, 225, 300].map(x => `Q${x + 37.5} 74 ${x + 75} 18`).join('')}" ${line('var(--x4)', 2)}/>`
  }
  return { at }
}
