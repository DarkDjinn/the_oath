import { heart, line, type Extra, type Options } from '../../draw'

/** Postmarked Love: `stamp` is the picture on the tilted stamp (the drawn flower is the "flower" choice); `edge` is in CSS. */
const onStamp = (inner: string) => `<g transform="rotate(9 265 124)">${inner}</g>`
export const extra = (o: Options): Extra => {
  if (o.stamp === 'heart') return { front: onStamp(heart(274.5, 133, 1.55, 'fill="var(--x15)"')) }
  if (o.stamp === 'asterisk') return { front: onStamp(`<path d="M274.5 104V158M251 117L298 145M298 117L251 145" ${line('var(--x15)', 8)}/>`) }
  return {}
}
