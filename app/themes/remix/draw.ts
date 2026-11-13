/**
 * Small vector motifs for the remix styles' option choices. Each returns SVG markup in the
 * hero's own coordinates; colours are CSS colour values (usually `var(--xN)` from the style's
 * palette, so a replacement takes the same colours as what it replaces). Fixed markup only:
 * never campaign data, so safe for v-html.
 */
const n = (v: number) => Math.round(v * 10) / 10
const pt = (cx: number, cy: number, r: number, deg: number) => `${n(cx + r * Math.cos((deg * Math.PI) / 180))} ${n(cy + r * Math.sin((deg * Math.PI) / 180))}`

export const fill = (c: string) => `fill="${c}" stroke="none"`
export const line = (c: string, w = 3) => `fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`

/** A star of `points` points; `inner` is the inner radius as a share of r. */
export function star(cx: number, cy: number, r: number, c: string, points = 5, inner = 0.45, rot = -90) {
  const p: string[] = []
  for (let i = 0; i < points * 2; i++) p.push(pt(cx, cy, i % 2 ? r * inner : r, rot + (i * 180) / points))
  return `<path d="M${p.join('L')}Z" ${fill(c)}/>`
}
export const diamond = (cx: number, cy: number, w: number, h: number, c: string) =>
  `<path d="M${cx} ${n(cy - h / 2)}L${n(cx + w / 2)} ${cy}L${cx} ${n(cy + h / 2)}L${n(cx - w / 2)} ${cy}Z" ${fill(c)}/>`
export const circle = (cx: number, cy: number, r: number, attrs: string) => `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" ${attrs}/>`
export const heart = (cx: number, cy: number, s: number, attrs: string) =>
  `<path d="M${cx} ${n(cy + 14 * s)}C${n(cx - 26 * s)} ${n(cy - 2 * s)} ${n(cx - 18 * s)} ${n(cy - 20 * s)} ${cx} ${n(cy - 9 * s)}C${n(cx + 18 * s)} ${n(cy - 20 * s)} ${n(cx + 26 * s)} ${n(cy - 2 * s)} ${cx} ${n(cy + 14 * s)}Z" ${attrs}/>`
/** Straight rays from (cx, cy), between radii r1 and r2. */
export function rays(cx: number, cy: number, r1: number, r2: number, count: number, c: string, w = 3, from = 0, to = 360) {
  const span = to - from
  const steps = span >= 360 ? count : count - 1
  let d = ''
  for (let i = 0; i < count; i++) {
    const a = from + (span * i) / steps
    d += `M${pt(cx, cy, r1, a)}L${pt(cx, cy, r2, a)}`
  }
  return `<path d="${d}" ${line(c, w)}/>`
}
/** A leaf (pointed ellipse) from its base, `deg` pointing the way it grows. */
export function leaf(x: number, y: number, len: number, wid: number, deg: number, c: string) {
  const tip = pt(x, y, len, deg)
  const m1 = pt(x, y, len / 2, deg)
  const [mx, my] = m1.split(' ').map(Number) as [number, number]
  const side1 = pt(mx, my, wid / 2, deg + 90)
  const side2 = pt(mx, my, wid / 2, deg - 90)
  return `<path d="M${x} ${y}Q${side1} ${tip}Q${side2} ${x} ${y}Z" ${fill(c)}/>`
}
/** A round flower: `petals` round petals around a centre. */
export function flower(cx: number, cy: number, r: number, petal: string, centre: string, petals = 8) {
  let out = ''
  for (let i = 0; i < petals; i++) {
    const [px, py] = pt(cx, cy, r * 0.62, (i * 360) / petals).split(' ').map(Number) as [number, number]
    out += circle(px, py, r * 0.42, fill(petal))
  }
  return out + circle(cx, cy, r * 0.36, fill(centre))
}
/** A daisy: many slim petals. */
export function daisy(cx: number, cy: number, r: number, petal: string, centre: string, petals = 14) {
  let out = ''
  for (let i = 0; i < petals; i++) {
    const a = (i * 360) / petals
    out += `<ellipse cx="${pt(cx, cy, r * 0.58, a).split(' ')[0]}" cy="${pt(cx, cy, r * 0.58, a).split(' ')[1]}" rx="${n(r * 0.42)}" ry="${n(r * 0.13)}" transform="rotate(${n(a)} ${pt(cx, cy, r * 0.58, a)})" ${fill(petal)}/>`
  }
  return out + circle(cx, cy, r * 0.3, fill(centre))
}
/** A pomegranate centred on (cx, cy), about 2s·22 wide. */
export const pomegranate = (cx: number, cy: number, s: number, body: string, crown: string, seed: string) =>
  `<g transform="translate(${n(cx)} ${n(cy)}) scale(${s})">`
  + `<path d="M0-18C14-18 22-6 22 6 22 20 12 28 0 28S-22 20-22 6-14-18 0-18Z" ${fill(body)}/>`
  + `<path d="M-8-15-6-27 0-19 6-27 8-15Z" ${fill(crown)}/>`
  + [[-8, 2], [0, 9], [8, 2], [0, -5], [-6, 16], [6, 16]].map(([a, b]) => circle(a!, b!, 2.6, fill(seed))).join('')
  + '</g>'
/** An olive sprig: a stem along `deg` with leaves and a few olives. */
export function oliveSprig(x: number, y: number, len: number, deg: number, leafC: string, fruit: string, stem: string) {
  const end = pt(x, y, len, deg)
  let out = `<path d="M${x} ${y}L${end}" ${line(stem, 2.5)}/>`
  for (let i = 1; i <= 5; i++) {
    const [bx, by] = pt(x, y, (len * i) / 6, deg).split(' ').map(Number) as [number, number]
    out += leaf(bx, by, len * 0.32, len * 0.1, deg + (i % 2 ? 50 : -50), leafC)
  }
  for (const t of [0.35, 0.7]) {
    const [bx, by] = pt(x, y, len * t, deg).split(' ').map(Number) as [number, number]
    out += circle(bx + 5, by + 6, len * 0.06, fill(fruit))
  }
  return out
}
/** A lemon slice. */
export const lemon = (cx: number, cy: number, r: number, rind: string, flesh: string, seg: string) =>
  circle(cx, cy, r, fill(rind)) + circle(cx, cy, r * 0.8, fill(flesh)) + rays(cx, cy, r * 0.12, r * 0.72, 8, seg, Math.max(1, r * 0.08))
/** A paper lantern hanging from (x, y), h tall in all. */
export const lantern = (x: number, y: number, h: number, body: string, band: string, cord: string) =>
  `<path d="M${x} ${y}V${n(y + h * 0.3)}" ${line(cord, 1.6)}/>`
  + `<ellipse cx="${x}" cy="${n(y + h * 0.62)}" rx="${n(h * 0.2)}" ry="${n(h * 0.32)}" ${fill(body)}/>`
  + `<path d="M${n(x - h * 0.1)} ${n(y + h * 0.3)}H${n(x + h * 0.1)}M${n(x - h * 0.1)} ${n(y + h * 0.94)}H${n(x + h * 0.1)}" ${line(band, h * 0.06)}/>`
  + `<path d="M${n(x - h * 0.19)} ${n(y + h * 0.62)}H${n(x + h * 0.19)}" ${line(band, 1.2)} opacity="0.6"/>`
/** A balloon on a string. */
export const balloon = (cx: number, cy: number, r: number, c: string, cord: string) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${n(r * 0.82)}" ry="${r}" ${fill(c)}/><path d="M${cx} ${n(cy + r)}q-6 ${n(r * 0.6)} 2 ${n(r * 1.2)}t-2 ${n(r * 1.2)}" ${line(cord, 1.6)}/>`
/** A wavy squiggle across, starting at (x, y). */
export const squiggle = (x: number, y: number, len: number, amp: number, c: string, w = 4) => {
  const step = len / 6
  let d = `M${x} ${y}`
  for (let i = 0; i < 6; i++) d += `q${n(step / 2)} ${i % 2 ? amp : -amp} ${n(step)} 0`
  return `<path d="${d}" ${line(c, w)}/>`
}
/** An eighth note. */
export const note = (x: number, y: number, s: number, c: string) =>
  `<ellipse cx="${x}" cy="${y}" rx="${n(8 * s)}" ry="${n(5.6 * s)}" transform="rotate(-20 ${x} ${y})" ${fill(c)}/><path d="M${n(x + 7 * s)} ${y}V${n(y - 30 * s)}q${n(9 * s)} ${n(5 * s)} ${n(11 * s)} ${n(16 * s)}" ${line(c, 2.6 * s)}/>`
/** A comet: a curved trail ending in a bright head at (x, y). */
export const comet = (x: number, y: number, len: number, deg: number, head: string, tail: string) => {
  const [sx, sy] = pt(x, y, len, deg + 180).split(' ').map(Number) as [number, number]
  const [cx, cy] = pt((x + sx) / 2, (y + sy) / 2, len * 0.18, deg + 90).split(' ').map(Number) as [number, number]
  return `<path d="M${n(sx)} ${n(sy)}Q${n(cx)} ${n(cy)} ${x} ${y}" ${line(tail, 4)}/>` + star(x, y, 9, head, 4, 0.35, -90)
}
/** A sparkle: a four-point star. */
export const sparkle = (cx: number, cy: number, r: number, c: string) => star(cx, cy, r, c, 4, 0.3)

/**
 * What a style's options add: `back` behind the hero art, `front` over it, `at[part]` exactly
 * where that part of the art ends (so a replacement keeps its layer), `body` beside the sections.
 */
export interface Extra { back?: string, front?: string, body?: string, at?: Record<string, string> }
export type Options = Record<string, string>

/** A small drawing placed at a share of the body's height, in its side margin (start or end). */
export const bodyBit = (topPct: number, side: 'start' | 'end', size: number, viewBox: string, inner: string, tilt = 0) =>
  `<span class="rx-bit" style="top:${topPct}%;${side === 'start' ? 'inset-inline-start' : 'inset-inline-end'}:4px;width:${size}px;rotate:${tilt}deg"><svg viewBox="${viewBox}">${inner}</svg></span>`
