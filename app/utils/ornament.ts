/**
 * The invitation's engraving, generated as SVG markup.
 *
 * Everything here is deterministic (seeded) and runs identically on the server
 * and in the browser, so ornaments are server-rendered with no hydration drift.
 * Colours come from CSS classes (see `.orn` in main.css), never inline.
 *
 *   o-line   gold stroke, no fill          o-ink    solid gold shape
 *   o-leaf   leaf: ground fill, gold edge  o-rose   rose: burgundy fill, gold edge
 *   o-moon   moon-white fill               o-gap    ground-coloured stroke (braid interior)
 *   o-draw   stems that draw themselves    o-bloom  details that fade in after the stems
 */

type Pt = [number, number]
export interface Art { viewBox: string, body: string }

const f = (n: number) => n.toFixed(1)

function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Catmull-Rom spline through `pts`, returned as dense samples. */
function spline(pts: Pt[], step = 3): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)]!, p1 = pts[i]!, p2 = pts[i + 1]!, p3 = pts[Math.min(i + 2, pts.length - 1)]!
    const n = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / step))
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t
      const at = (a: 0 | 1) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)
      out.push([at(0), at(1)])
    }
  }
  out.push(pts[pts.length - 1]!)
  return out
}

const pathOf = (s: Pt[]) => 'M' + s.map(p => `${f(p[0])} ${f(p[1])}`).join('L')

function tangent(s: Pt[], i: number) {
  const a = s[Math.max(i - 1, 0)]!, b = s[Math.min(i + 1, s.length - 1)]!
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  return { tx: (b[0] - a[0]) / l, ty: (b[1] - a[1]) / l }
}

function leaf(x: number, y: number, angle: number, l: number): string {
  const w = l * 0.32
  return `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(angle)})"><path class="o-leaf" d="M0 0C${f(l * 0.25)} ${f(-w)} ${f(l * 0.7)} ${f(-w)} ${f(l)} 0C${f(l * 0.7)} ${f(w)} ${f(l * 0.25)} ${f(w)} 0 0Z"/><path class="o-line o-hair" d="M0 0L${f(l * 0.85)} 0"/></g>`
}

/** A five-petalled engraved rose: three rotated petal rings and a spiral heart. */
export function rose(x: number, y: number, r: number, rot = 0, extraClass = ''): string {
  let g = `<g class="o-rose o-bloom ${extraClass}" transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)})">`
  for (const [k, off] of [[1, 0], [0.72, 36], [0.47, 10]] as const) {
    const q = r * k
    for (let i = 0; i < 5; i++) {
      g += `<path transform="rotate(${i * 72 + off})" d="M0 0C${f(-q * 0.62)} ${f(-q * 0.3)} ${f(-q * 0.66)} ${f(-q)} 0 ${f(-q)}C${f(q * 0.66)} ${f(-q)} ${f(q * 0.62)} ${f(-q * 0.3)} 0 0Z"/>`
    }
  }
  g += `<path fill="none" d="M${f(-r * 0.16)} 0A${f(r * 0.16)} ${f(r * 0.16)} 0 1 1 ${f(r * 0.1)} ${f(r * 0.13)}A${f(r * 0.09)} ${f(r * 0.09)} 0 1 1 ${f(-r * 0.02)} ${f(-r * 0.03)}"/>`
  return g + '</g>'
}

interface VineOptions { seed?: number, width?: number, thornEvery?: number, leafEvery?: number, leafLen?: number, delay?: number }

/** A thorned stem through `pts`, with optional leaves. */
export function vine(pts: Pt[], o: VineOptions = {}): string {
  const { seed = 1, width = 1.6, thornEvery = 13, leafEvery = 0, leafLen = 14, delay = 0 } = o
  const s = spline(pts), R = rng(seed)
  let leaves = '', thorns = '', side = 1, dist = 0, nextThorn = thornEvery * 0.6, nextLeaf = leafEvery * 0.5
  for (let i = 1; i < s.length; i++) {
    const p = s[i]!, q = s[i - 1]!
    dist += Math.hypot(p[0] - q[0], p[1] - q[1])
    const { tx, ty } = tangent(s, i), nx = -ty, ny = tx
    if (dist >= nextThorn) {
      nextThorn += thornEvery * (0.7 + R() * 0.6)
      side = -side
      const h = 5 + R() * 3.5
      thorns += `M${f(p[0] - tx * 2)} ${f(p[1] - ty * 2)}L${f(p[0] + nx * h * side + tx * 2.5)} ${f(p[1] + ny * h * side + ty * 2.5)}L${f(p[0] + tx * 2)} ${f(p[1] + ty * 2)}Z`
    }
    if (leafEvery && dist >= nextLeaf) {
      nextLeaf += leafEvery * (0.7 + R() * 0.6)
      const sd = R() > 0.5 ? 1 : -1
      leaves += leaf(p[0], p[1], Math.atan2(ty, tx) * 180 / Math.PI + sd * (38 + R() * 25), leafLen * (0.75 + R() * 0.5))
    }
  }
  return `<path class="o-line o-draw" style="--d:${delay}s" pathLength="1" stroke-width="${width}" d="${pathOf(s)}"/>`
    + `<g class="o-bloom">${leaves}<path class="o-ink" d="${thorns}"/></g>`
}

export function sparkle(x: number, y: number, s: number, cls = 'o-ink'): string {
  return `<path class="${cls} o-bloom" d="M${f(x)} ${f(y - s)}Q${f(x)} ${f(y)} ${f(x + s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y + s)}Q${f(x)} ${f(y)} ${f(x - s)} ${f(y)}Q${f(x)} ${f(y)} ${f(x)} ${f(y - s)}Z"/>`
}

export function stars(n: number, seed: number, box: [number, number, number, number]): string {
  const R = rng(seed)
  let o = ''
  for (let i = 0; i < n; i++) {
    const x = box[0] + R() * box[2], y = box[1] + R() * box[3], r = R()
    o += r > 0.88
      ? sparkle(x, y, 3 + R() * 3.5, 'o-star')
      : `<circle class="o-star" cx="${f(x)}" cy="${f(y)}" r="${f(0.4 + r * 0.8)}" opacity="${f(0.3 + R() * 0.55)}"/>`
  }
  return o
}

/** A crescent: a disc of radius `R` with an offset disc of radius `r2` cut away. */
export function crescent(cx: number, cy: number, R: number, dx: number, dy: number, r2: number): string {
  const d = Math.hypot(dx, dy), a = (R * R - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(R * R - a * a, 0))
  const mx = cx + a * dx / d, my = cy + a * dy / d
  const p1: Pt = [mx - h * dy / d, my + h * dx / d], p2: Pt = [mx + h * dy / d, my - h * dx / d]
  return `M${f(p1[0])} ${f(p1[1])}A${R} ${R} 0 1 1 ${f(p2[0])} ${f(p2[1])}A${r2} ${r2} 0 1 0 ${f(p1[0])} ${f(p1[1])}Z`
}

/** A hollow band along sampled points: gold stroke with a ground-coloured core. */
function band(pts: Pt[], w: number): string {
  const d = pathOf(pts)
  return `<path class="o-line" stroke-width="${w}" stroke-linecap="round" d="${d}"/><path class="o-gap" stroke-width="${f(w - 2.2)}" stroke-linecap="round" d="${d}"/>`
}

/**
 * Two interlaced strands (the one Norse element of the invitation).
 * `pos(u, side)` places strand `side` (+1 / -1) at `u` in 0..1; `n` is the number of crossings.
 */
function braid(pos: (u: number, side: number) => Pt, n: number, w: number): string {
  const N = n * 16, A: Pt[] = [], B: Pt[] = []
  for (let i = 0; i <= N; i++) {
    A.push(pos(i / N, 1))
    B.push(pos(i / N, -1))
  }
  let o = band(A, w) + band(B, w)
  // Re-lay strand A over every second crossing so the strands read as woven.
  for (let k = 0; k <= n; k += 2) {
    const c = k * 16, seg = A.slice(Math.max(c - 5, 0), Math.min(c + 6, N + 1))
    if (seg.length > 1) o += band(seg, w)
  }
  return `<g class="o-bloom">${o}</g>`
}

export function ringBraid(cx: number, cy: number, R: number, amp: number, n: number, w: number): string {
  return braid((u, s) => {
    const a = u * Math.PI * 2, r = R + s * amp * Math.sin(n * a / 2)
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  }, n, w)
}

export function lineBraid(x0: number, x1: number, y: number, amp: number, n: number, w: number): string {
  return braid((u, s) => [x0 + (x1 - x0) * u, y + s * amp * Math.sin(u * n * Math.PI)], n, w)
}

function heartPoints(cx: number, cy: number, k: number, wobble: number, phase: number): Pt[] {
  const p: Pt[] = []
  for (let i = 0; i <= 120; i++) {
    const t = i / 120 * Math.PI * 2, w = 1 + wobble * Math.sin(t * 9 + phase)
    p.push([cx + 16 * Math.sin(t) ** 3 * k * w, cy - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k * w])
  }
  return p
}

/** Iron railing with spear finials between x0 and x1. */
function fence(y: number, h: number, n: number, x0: number, x1: number): string {
  let o = `<path class="o-line" stroke-width="1.6" d="M${x0} ${y}H${x1}M${x0} ${f(y + h * 0.78)}H${x1}"/>`
  const step = (x1 - x0) / n
  for (let i = 0; i <= n; i++) {
    const x = x0 + i * step, tall = i % 2 ? 0 : 10
    o += `<path class="o-line" stroke-width="1.3" d="M${f(x)} ${y + h}V${y - 8 - tall}"/><path class="o-ink" d="M${f(x)} ${y - 22 - tall}L${f(x + 4)} ${y - 10 - tall}L${f(x)} ${y - 5 - tall}L${f(x - 4)} ${y - 10 - tall}Z"/>`
    if (i < n) {
      o += `<path class="o-line" stroke-width="1" d="M${f(x)} ${f(y + h * 0.78)}Q${f(x + step / 2)} ${f(y + h * 0.2)} ${f(x + step)} ${f(y + h * 0.78)}"/><circle class="o-line" stroke-width="1" cx="${f(x + step / 2)}" cy="${f(y + h * 0.52)}" r="2.2"/>`
    }
  }
  return `<g class="o-bloom">${o}</g>`
}

const mirror = (g: string, width: number) => g + `<g transform="translate(${width} 0) scale(-1 1)">${g}</g>`

/** Seven moons along a shallow arc: waxing, full, waning. */
function moonPhases(cx: number, cy: number, R: number, r: number): string {
  let o = ''
  const lit = [0.25, 0.6, 1, 2, 1, 0.6, 0.25]
  lit.forEach((k, i) => {
    const a = (-90 + (i - 3) * 10.5) * Math.PI / 180, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R
    if (i === 3) {
      o += `<circle class="o-moon" cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.35)}"/><circle class="o-line" stroke-width="1" cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.35 + 3)}"/>`
      return
    }
    // Lit limb faces the full moon; the terminator is an ellipse of half-width |w|.
    const waxing = i < 3, w = r * (1 - k)
    const outer = `M${f(x)} ${f(y - r)}A${f(r)} ${f(r)} 0 0 ${waxing ? 1 : 0} ${f(x)} ${f(y + r)}`
    const inner = `A${f(Math.abs(w))} ${f(r)} 0 0 ${(w > 0) === waxing ? 0 : 1} ${f(x)} ${f(y - r)}Z`
    o += `<circle class="o-line" stroke-width="1" cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/><path class="o-moon" d="${outer}${inner}"/>`
  })
  return `<g class="o-bloom">${o}</g>`
}

// ---------------------------------------------------------------------------
// Finished pieces
// ---------------------------------------------------------------------------

/** Moon phases with a scatter of stars. Sits at the very top of the invitation. */
export const phasesArt: Art = {
  viewBox: '0 0 390 70',
  body: stars(64, 9, [10, 4, 370, 62]) + moonPhases(195, 330, 300, 6),
}

/** The thorn heart: two twisted briars, eight roses, a crescent in a braided ring. */
export const heartArt: Art = (() => {
  const cx = 150, cy = 118, k = 8
  const a = heartPoints(cx, cy, k, 0.035, 0), b = heartPoints(cx, cy, k, 0.035, Math.PI)
  let body = stars(44, 21, [20, 0, 260, 240])
  body += vine(a.filter((_, i) => i % 4 === 0), { seed: 21, width: 1.9, thornEvery: 12, leafEvery: 40, leafLen: 12 })
  body += vine(b.filter((_, i) => i % 4 === 0), { seed: 22, width: 1.1, thornEvery: 16, delay: 0.25 })
  ;[10, 24, 38, 52, 68, 82, 96, 110].forEach((i, n) => { body += rose(a[i]![0], a[i]![1], n % 2 ? 9 : 12, n * 31) })
  body += rose(a[60]![0], a[60]![1], 15)
  body += ringBraid(cx, cy - 8, 40, 4, 12, 4.6)
  body += `<path class="o-moon o-bloom" d="${crescent(cx, cy - 8, 25, 9, -4, 21)}"/>` + sparkle(cx + 13, cy - 17, 5) + sparkle(cx - 4, cy + 6, 2.5)
  return { viewBox: '0 0 300 268', body }
})()

/** A round wreath of briars and roses around the crescent in its braided ring. */
export const wreathArt: Art = (() => {
  const cx = 150, cy = 134
  const arc = (a0: number, a1: number, r: number, n = 11): Pt[] => Array.from({ length: n }, (_, i) => {
    const a = (a0 + (a1 - a0) * i / (n - 1)) * Math.PI / 180
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]
  })
  let body = stars(40, 12, [10, 0, 280, 260])
  body += vine(arc(95, 268, 108), { seed: 2, width: 1.8, thornEvery: 12, leafEvery: 26, leafLen: 15 })
  body += vine(arc(85, -88, 108), { seed: 8, width: 1.8, thornEvery: 12, leafEvery: 26, leafLen: 15 })
  body += vine(arc(110, 250, 101, 8), { seed: 3, width: 1, thornEvery: 15, delay: 0.25 }) + vine(arc(70, -70, 101, 8), { seed: 4, width: 1, thornEvery: 15, delay: 0.25 })
  for (const [i, [a, r]] of ([[90, 20], [128, 14], [52, 14], [160, 10], [20, 10], [200, 9], [-20, 9], [270, 11], [235, 8], [305, 8]] as const).entries()) {
    const t = a * Math.PI / 180
    body += rose(cx + Math.cos(t) * 108, cy + Math.sin(t) * 108, r, i * 37)
  }
  body += ringBraid(cx, cy, 74, 5, 18, 5)
  body += `<path class="o-moon o-bloom" d="${crescent(cx, cy, 50, 15, -11, 42)}"/>` + sparkle(cx + 16, cy - 15, 7) + sparkle(cx - 5, cy + 16, 3.5)
  return { viewBox: '0 0 300 268', body }
})()

/** A large crescent inside a wide braided ring: the most Norse of the emblems, and the plainest. */
export const moonRingArt: Art = (() => {
  const cx = 150, cy = 134
  let body = stars(60, 14, [0, 0, 300, 268])
  body += ringBraid(cx, cy, 104, 7.5, 22, 6.2)
  body += `<circle class="o-line o-bloom" stroke-width=".8" cx="${cx}" cy="${cy}" r="89"/><circle class="o-line o-bloom" stroke-width=".8" stroke-dasharray="1 6" stroke-linecap="round" cx="${cx}" cy="${cy}" r="120"/>`
  body += `<path class="o-moon o-bloom" d="${crescent(cx, cy, 72, 18, -16, 61)}"/>` + sparkle(cx + 18, cy - 20, 8) + sparkle(cx - 3, cy + 22, 4) + sparkle(cx + 38, cy + 14, 3)
  return { viewBox: '0 0 300 268', body }
})()

/**
 * The garden gate: a pointed iron arch with a rose roundel, railings and climbing briars.
 * The RSVP plate is laid over its lower half by the page.
 */
export const gateArt: Art = (() => {
  let body = `<path class="o-line o-draw" pathLength="1" stroke-width="1.6" d="M70 250V130Q70 56 195 12Q320 56 320 130V250"/><path class="o-line o-bloom" stroke-width=".7" d="M84 250V132Q84 66 195 28Q306 66 306 132V250"/>`
  let bars = ''
  for (let i = 0; i < 9; i++) {
    const x = 84 + (i + 0.5) * (222 / 9), top = 28 + Math.abs(x - 195) / 111 * 96 + 14
    bars += `M${f(x)} ${f(top)}V250`
  }
  body += `<path class="o-line o-bloom o-faint" stroke-width=".8" d="${bars}"/>`
  body += `<circle class="o-ground o-bloom" cx="195" cy="82" r="22"/><circle class="o-line o-bloom" stroke-width="1" cx="195" cy="82" r="22"/>` + rose(195, 82, 14, 0, 'o-gate-rose')
  const half = fence(218, 40, 4, 0, 70)
    + vine([[70, 250], [58, 176], [76, 106], [62, 46], [96, 6], [150, 2]], { seed: 31, width: 1.5, thornEvery: 12, leafEvery: 24, leafLen: 13, delay: 0.3 })
    + rose(60, 46, 12) + rose(78, 110, 9, 40) + rose(152, 0, 10, 20) + rose(56, 178, 9, 10)
  body += mirror(half, 390)
  return { viewBox: '0 -14 390 264', body }
})()

/** A briar climbing one edge of the page, a rose at each end. Mirrored by CSS for the opposite edge. */
export const sideVineArt: Art = {
  viewBox: '0 0 60 420',
  body: vine([[10, 408], [24, 350], [8, 280], [28, 210], [10, 140], [26, 70], [12, 14]], { seed: 15, width: 1.3, thornEvery: 12, leafEvery: 26, leafLen: 12, delay: 0.5 })
    + rose(12, 10, 10) + rose(30, 208, 9, 30) + rose(6, 284, 7, 60) + rose(10, 410, 9, 45),
}

/** A short briar entering from the page edge beside a section heading. Mirrored by CSS. */
export const sprayArt: Art = {
  viewBox: '0 0 70 130',
  body: vine([[0, 124], [22, 98], [14, 66], [36, 42], [40, 16]], { seed: 7, width: 1.3, thornEvery: 11, leafEvery: 20, leafLen: 12 })
    + rose(40, 12, 10) + rose(12, 68, 7, 40),
}

/** Iron railing with spear finials, full width. Frames the times and closes the page. */
export const railArt: Art = { viewBox: '0 -6 390 66', body: fence(30, 28, 13, 0, 390) }

/** The crescent in its braided ring, alone: the closing mark. */
export const sealArt: Art = {
  viewBox: '0 0 120 120',
  body: ringBraid(60, 60, 44, 4, 12, 4.6) + `<path class="o-moon" d="${crescent(60, 60, 27, 10, -4, 23)}"/>` + sparkle(74, 50, 5) + sparkle(56, 76, 2.5),
}

/** Section divider: a short braid between two hairlines. */
export const braidArt: Art = {
  viewBox: '0 0 240 16',
  body: `<path class="o-line" stroke-width="1" d="M0 8H62M178 8H240"/>` + lineBraid(72, 168, 8, 4, 8, 4.6),
}

/** Section divider: a single rose between two hairlines. */
export const roseRuleArt: Art = {
  viewBox: '0 0 240 24',
  body: `<path class="o-line" stroke-width="1" d="M0 12H100M140 12H240"/>` + rose(120, 12, 10),
}

/** Pointed-arch frame used around the optional hero photograph (userSpaceOnUse clip, 300 x 400). */
export const archPath = 'M0 400V150Q0 50 150 0Q300 50 300 150V400Z'
