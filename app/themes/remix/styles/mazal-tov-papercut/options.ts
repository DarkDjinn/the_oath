import { flower, leaf, pomegranate, type Extra, type Options } from '../../draw'

/** Mazal Tov Papercut: `papercut` is the facing pair over the name banner (doves as drawn); `paper-edge` is in CSS. */
export const extra = (o: Options): Extra => {
  if (o.papercut === 'pomegranates') {
    return { at: { papercut: [92, 283].map(x => leaf(x - 4, 150, 26, 10, -130, 'var(--x12)') + leaf(x + 4, 150, 26, 10, -50, 'var(--x12)') + pomegranate(x, 182, 1.45, 'var(--x7)', 'var(--x9)', 'var(--x11)')).join('') } }
  }
  if (o.papercut === 'floral') {
    return { at: { papercut: [92, 283].map(x => leaf(x - 18, 205, 30, 11, 200, 'var(--x12)') + leaf(x + 18, 205, 30, 11, -20, 'var(--x12)') + flower(x, 176, 46, 'var(--x7)', 'var(--x9)', 8)).join('') } }
  }
  return {}
}
