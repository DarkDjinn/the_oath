import { circle, fill, leaf, lemon, type Extra, type Options } from '../../draw'

/** Jaffa Sun: `tile` sets the motif in the two rows of tiles, top and bottom. */
const centres = [25, 584].flatMap(y => Array.from({ length: 12 }, (_, k) => [15 + 32 * k, y] as const))
export const extra = (o: Options): Extra => {
  if (o.tile === 'olive') {
    return { front: centres.map(([x, y]) => leaf(x - 1, y + 7, 15, 7, -60, 'var(--x9)') + leaf(x + 1, y + 7, 15, 7, -120, 'var(--x9)') + circle(x, y + 2, 3.2, fill('var(--x8)'))).join('') }
  }
  if (o.tile === 'citrus') return { front: centres.map(([x, y]) => lemon(x, y, 9, 'var(--x9)', 'var(--x7)', 'var(--x9)')).join('') }
  return {}
}
