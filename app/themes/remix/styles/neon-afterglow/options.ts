import { circle, fill, heart, line, type Extra, type Options } from '../../draw'

/**
 * Neon Afterglow: `neon-shape` is the glowing sign at the centre of the rings (a heart, an
 * infinity loop, or the drawn star); `background` what runs behind (the drawn scan lines as a
 * grid, dots, or rays).
 */
const glow = (shape: (attrs: string) => string) => shape(`fill="none" stroke="var(--x9)" stroke-width="16" stroke-linejoin="round" opacity="0.25"`) + shape(`fill="none" stroke="var(--x9)" stroke-width="6" stroke-linejoin="round"`) + shape(`fill="none" stroke="var(--color-plate)" stroke-width="1.6" stroke-linejoin="round"`)
export const extra = (o: Options): Extra => {
  const at: Record<string, string> = {}
  if (o['neon-shape'] === 'heart') at.shape = glow(a => heart(189, 187, 2.4, a))
  if (o['neon-shape'] === 'infinity') at.shape = glow(a => `<path d="M189 185C170 160 132 160 132 185S170 210 189 185 246 160 246 185 208 210 189 185Z" ${a}/>`)
  if (o.background === 'dots') {
    let d = ''
    for (let y = 30; y < 430; y += 28) for (let x = 14 + ((y / 28) % 2) * 14; x < 375; x += 28) d += circle(x, y, 1.8, fill('var(--x11)'))
    at.background = `<g opacity="0.7">${d}</g>`
  }
  if (o.background === 'rays') {
    let d = ''
    for (let a = 0; a < 360; a += 12) d += `M${(189 + 70 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(185 + 70 * Math.sin(a * Math.PI / 180)).toFixed(1)}L${(189 + 420 * Math.cos(a * Math.PI / 180)).toFixed(1)} ${(185 + 420 * Math.sin(a * Math.PI / 180)).toFixed(1)}`
    at.background = `<path d="${d}" ${line('var(--x11)', 1.4)} opacity="0.6"/>`
  }
  return { at }
}
