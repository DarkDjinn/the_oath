import { line, oliveSprig, pomegranate, star, type Extra, type Options } from '../../draw'

/** Jerusalem Stone: `emblem` sits in the heart of the rosette window; `masonry` is the coursing of the lower wall. */
export const extra = (o: Options): Extra => {
  let front = ''
  if (o.emblem === 'olive') front += oliveSprig(172, 212, 32, -45, 'var(--color-wine)', 'var(--x15)', 'var(--x15)')
  else if (o.emblem === 'star') front += star(187, 197, 21, 'var(--x15)', 6, 0.55)
  else front += pomegranate(187, 196, 0.8, 'var(--color-wine)', 'var(--x15)', 'var(--x14)')
  if (o.masonry === 'keystone') {
    let d = ''
    for (let a = 200; a <= 340; a += 10) {
      const r = Math.PI / 180 * a
      d += `M${(187 + 168 * Math.cos(r)).toFixed(1)} ${(600 + 168 * Math.sin(r)).toFixed(1)}L${(187 + 120 * Math.cos(r)).toFixed(1)} ${(600 + 120 * Math.sin(r)).toFixed(1)}`
    }
    front += `<path d="M19 600A168 168 0 0 1 355 600M67 600A120 120 0 0 1 307 600${d}" ${line('var(--x26)', 2)}/>`
  }
  return { front }
}
