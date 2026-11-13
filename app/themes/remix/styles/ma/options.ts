import { circle, fill, line, type Extra, type Options } from '../../draw'

/** Ma: `mark` is the great shape behind the cranes: the vermilion ensō disc as drawn, a blossom branch, or a folding fan. */
export const extra = (o: Options): Extra => {
  if (o.mark === 'branch') {
    const blossoms = [[330, 108], [292, 140], [250, 150], [214, 178], [176, 186], [300, 196], [236, 228], [355, 160]]
    return {
      at: { mark: `<path d="M380 96C320 120 270 150 236 180S170 200 140 198M300 132C310 160 302 186 296 200M250 156C246 190 238 214 236 230" ${line('var(--x5)', 7)}/>`
        + blossoms.map(([x, y], i) => [0, 72, 144, 216, 288].map(a => circle(x! + 9 * Math.cos(((a + i * 20) * Math.PI) / 180), y! + 9 * Math.sin(((a + i * 20) * Math.PI) / 180), 7, fill('var(--x3)'))).join('') + circle(x!, y!, 4, fill('var(--x4)'))).join('') },
    }
  }
  if (o.mark === 'fan') {
    let blades = ''
    for (let i = 0; i < 10; i++) {
      const a1 = 200 + i * 14
      const a2 = a1 + 14
      const p = (a: number, r: number) => `${(241 + r * Math.cos((a * Math.PI) / 180)).toFixed(1)} ${(300 + r * Math.sin((a * Math.PI) / 180)).toFixed(1)}`
      blades += `<path d="M${p(a1, 30)}L${p(a1, 170)}A170 170 0 0 1 ${p(a2, 170)}L${p(a2, 30)}Z" ${fill(i % 2 ? 'var(--x3)' : 'var(--x4)')}/>`
    }
    return { at: { mark: blades + `<path d="M241 300V318" ${line('var(--x5)', 6)}/>` } }
  }
  return {}
}
