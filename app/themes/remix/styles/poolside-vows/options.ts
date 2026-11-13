import { circle, fill, line, rays, type Extra, type Options } from '../../draw'

/**
 * Poolside Vows: `water` is the surface of the pool (ripples as drawn, rolling waves, or pool
 * tiles); `summer-icon` the little picture in the lower corner (an umbrella, the sun, a flamingo).
 */
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.water === 'waves') {
    let d = ''
    for (let y = 20; y < 430; y += 34) d += `M-10 ${y}q24 -14 48 0t48 0 48 0 48 0 48 0 48 0 48 0 48 0 48 0`
    at.water = `<path d="${d}" ${line('var(--color-plate)', 5)} opacity="0.55"/>`
  }
  if (o.water === 'tiles') {
    let d = ''
    for (let y = 0; y <= 430; y += 30) d += `M0 ${y}H375`
    for (let x = 0; x <= 375; x += 30) d += `M${x} 0V430`
    at.water = `<path d="${d}" ${line('var(--color-plate)', 1.6)} opacity="0.45"/>`
  }
  const x = 52
  const y = 362
  if (o['summer-icon'] === 'sun') at.icon = rays(x, y, 17, 27, 12, 'var(--x9)', 3) + circle(x, y, 14, fill('var(--x9)'))
  else if (o['summer-icon'] === 'flamingo') {
    at.icon = `<path d="M${x - 16} ${y + 2}c-2 -16 18 -22 30 -12 8 7 6 18 -4 22 -10 4 -22 2 -26 -10Z" ${fill('var(--x10)')}/><path d="M${x + 12} ${y - 6}C${x + 22} ${y - 26} ${x + 14} ${y - 40} ${x + 4} ${y - 38}c-6 1-8 8-4 11" ${line('var(--x10)', 4)}/><path d="M${x - 2} ${y + 12}V${y + 34}M${x + 4} ${y + 12}l4 12-7 5" ${line('var(--x10)', 2.5)}/>`
  }
  else at.icon = `<path d="M${x - 28} ${y}Q${x} ${y - 44} ${x + 28} ${y}Z" ${fill('var(--x9)')}/><path d="M${x - 9} ${y}Q${x - 6} ${y - 30} ${x} ${y - 34}Q${x - 2} ${y - 18} ${x} ${y}Z" ${fill('var(--color-plate)')}/><path d="M${x} ${y - 34}V${y + 30}" ${line('var(--color-plate)', 3)}/>`
  return { at }
}
