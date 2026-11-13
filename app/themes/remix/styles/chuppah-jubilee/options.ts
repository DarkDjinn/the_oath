import { circle, fill, flower, lantern, leaf, line, type Extra, type Options } from '../../draw'

/**
 * Chuppah Jubilee: `canopy` is the dressing of the canopy top (scalloped with its crown of
 * flowers as drawn, bold stripes, or a full floral garland); `hanging` what hangs inside the
 * posts (ribbons as drawn, lanterns, or strings of petals).
 */
const strings = [62, 92, 276, 306]
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o.canopy === 'striped') {
    // Bold stripes cut to the canopy's own scalloped outline.
    const canopy = 'M-6 95Q82 15 188 50Q300 5 383 101Q321 141 255 91Q188 154 126 94Q54 141 -6 95Z'
    let s = ''
    for (let x = -10, k = 0; x < 390; x += 24, k++) s += `<rect x="${x}" y="0" width="24" height="160" ${fill(k % 2 ? 'var(--x7)' : 'var(--color-plate)')}/>`
    at.flowers = `<clipPath id="chuppah-jubilee-canopy-cut"><path d="${canopy}"/></clipPath><g clip-path="url(#chuppah-jubilee-canopy-cut)">${s}</g><path d="${canopy}" ${line('var(--x3)', 3)}/>`
  }
  if (o.canopy === 'floral') {
    let g = ''
    for (let x = 20; x <= 360; x += 34) g += leaf(x, 114, 18, 8, -150, 'var(--x11)') + leaf(x, 114, 18, 8, -30, 'var(--x11)') + flower(x, 108, 22, x % 68 ? 'var(--x7)' : 'var(--x8)', 'var(--x12)', 7)
    at.flowers = g
  }
  if (o.hanging === 'lanterns') at.hanging = strings.map((x, i) => lantern(x, 122, i % 2 ? 62 : 78, 'var(--x10)', 'var(--x9)', 'var(--x9)')).join('')
  if (o.hanging === 'petals') {
    at.hanging = strings.map(x => `<path d="M${x} 122V214" ${line('var(--x9)', 1.6)}/>` + [140, 166, 192, 214].map((y, k) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="9" transform="rotate(${k % 2 ? 30 : -30} ${x} ${y})" ${fill(k % 2 ? 'var(--x10)' : 'var(--x7)')}/>`).join('')).join('') + circle(0, 0, 0, fill('none'))
  }
  return { at }
}
