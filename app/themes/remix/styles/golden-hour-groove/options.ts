import { circle, fill, line, type Extra, type Options } from '../../draw'

/**
 * Golden Hour Groove: `groove` is the giant disc (rainbow rings as drawn, a flower, or a
 * vinyl record); `bands` the stripes behind it (wavy arches as drawn, straight, or none).
 */
export const extra = (o: Options): Extra => {
  let back = ''
  if (o.bands === 'stripes') for (let i = 0; i < 8; i++) back += `<rect x="${i * 47}" y="0" width="48" height="610" fill="var(--x${3 + i})"/>`
  let front = ''
  if (o.groove === 'flower') {
    for (let i = 0; i < 10; i++) {
      const a = i * 36
      front += `<ellipse cx="191" cy="${198 - 92}" rx="34" ry="70" transform="rotate(${a} 191 198)" fill="var(--x${11 + (i % 3)})"/>`
    }
    front += circle(191, 198, 46, fill('var(--x16)')) + circle(191, 198, 22, fill('var(--x17)'))
  }
  if (o.groove === 'record') {
    front += circle(191, 198, 150, fill('var(--color-ivory)'))
    for (let r = 60; r <= 140; r += 9) front += circle(191, 198, r, line('var(--color-ground)', 0.8) + ' opacity="0.35"')
    front += circle(191, 198, 48, fill('var(--x13)')) + circle(191, 198, 6, fill('var(--color-ivory)'))
  }
  return { at: { bands: back, groove: front } }
}
