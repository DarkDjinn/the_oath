import { line, rays, type Extra, type Options } from '../../draw'

/** Velvet Deco: `crest` is what radiates behind the tower; the default is the drawn fan from its foot. */
export const extra = (o: Options): Extra => {
  if (o.crest === 'sunburst') return { at: { crest: rays(189, 90, 34, 520, 40, 'var(--x2)', 1.6) } }
  if (o.crest === 'diamond') {
    let d = ''
    for (let k = -620; k <= 620; k += 34) d += `M${k} 0L${k + 610} 610M${k + 375} 0L${k - 235} 610`
    return { at: { crest: `<path d="${d}" ${line('var(--x2)', 1.2)} opacity="0.75"/>` } }
  }
  return {}
}
