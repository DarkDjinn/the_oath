/**
 * The gallery styles' art: small line drawings as SVG markup, one set per style.
 *
 * Every drawing is fixed markup from this file (never from user input), so it is safe for
 * `v-html`. Colours come from classes defined in gallery.css (`ga-*`), which read the
 * couple's colours, so every preset and every hand-picked palette repaints the art:
 *
 *   ga-line   accent stroke          ga-line2  second-accent stroke    ga-ink-line  text stroke
 *   ga-fill   accent fill            ga-fill2  second-accent fill      ga-fill3     a blend of the two
 *   ga-soft   faint accent fill      ga-soft2  faint second-accent     ga-ground    background fill
 *   ga-plate  panel fill             ga-ink    text fill               ga-thin      a finer stroke
 */

export const f = (n: number) => Number(n.toFixed(1))
export const svg = (viewBox: string, body: string, cls = '') => `<svg viewBox="${viewBox}"${cls ? ` class="${cls}"` : ''} aria-hidden="true" focusable="false">${body}</svg>`

/** `n` points evenly round a circle, as [x, y]. */
export const around = (n: number, r: number, cx: number, cy: number, start = -90) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((start + (360 / n) * i) * Math.PI) / 180
    return [f(cx + r * Math.cos(a)), f(cy + r * Math.sin(a))] as const
  })
export const rays = (n: number, r1: number, r2: number, cx: number, cy: number, from = 0, to = 360) =>
  Array.from({ length: n }, (_, i) => {
    const a = ((from + ((to - from) / (to - from === 360 ? n : n - 1)) * i - 90) * Math.PI) / 180
    return `M${f(cx + r1 * Math.cos(a))} ${f(cy + r1 * Math.sin(a))}L${f(cx + r2 * Math.cos(a))} ${f(cy + r2 * Math.sin(a))}`
  }).join('')
/** A leaf (pointed oval) centred on (x, y), `l` long, turned by `deg`. */
export const leaf = (x: number, y: number, l: number, w: number, deg: number, cls: string) =>
  `<path class="${cls}" transform="translate(${f(x)} ${f(y)}) rotate(${f(deg)})" d="M0 ${f(-l / 2)}C${f(w)} ${f(-l / 4)} ${f(w)} ${f(l / 4)} 0 ${f(l / 2)}C${f(-w)} ${f(l / 4)} ${f(-w)} ${f(-l / 4)} 0 ${f(-l / 2)}Z"/>`
export const heart = (x: number, y: number, s: number, cls: string) =>
  `<path class="${cls}" transform="translate(${x} ${y}) scale(${s})" d="M0 9C-7 4-10 1-10-3a5 5 0 0 1 10-2 5 5 0 0 1 10 2c0 4-3 7-10 12Z"/>`
export const diamond = (x: number, y: number, r: number, cls: string) => `<path class="${cls}" d="M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z"/>`
export const star4 = (x: number, y: number, r: number, cls: string) =>
  `<path class="${cls}" d="M${x} ${f(y - r)}Q${x} ${y} ${f(x + r)} ${y}Q${x} ${y} ${x} ${f(y + r)}Q${x} ${y} ${f(x - r)} ${y}Q${x} ${y} ${x} ${f(y - r)}Z"/>`
export const star5 = (x: number, y: number, r: number, deg: number, cls: string) => {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const rr = i % 2 ? r * 0.45 : r
    const a = ((deg - 90 + i * 36) * Math.PI) / 180
    return `${f(x + rr * Math.cos(a))} ${f(y + rr * Math.sin(a))}`
  })
  return `<path class="${cls}" stroke-linejoin="round" d="M${pts.join('L')}Z"/>`
}

// -------------------------------------------------------------------- emblems
// The drawing at the top of the invitation. Keyed by style, then by the style's own option.

type Emblems = Record<string, Record<string, string>>

export const EMBLEMS: Emblems = {
  still: {
    rule: svg('0 0 240 40', `<path class="ga-line ga-thin" d="M8 20H100M140 20H232"/><circle class="ga-line ga-thin" cx="120" cy="20" r="15"/>${diamond(120, 20, 8, 'ga-line ga-thin')}<circle class="ga-fill2" cx="56" cy="20" r="2.6"/><circle class="ga-fill2" cx="184" cy="20" r="2.6"/>`),
    dots: svg('0 0 240 40', '<circle class="ga-fill" cx="110" cy="20" r="4.5"/><circle class="ga-fill2" cx="130" cy="20" r="4.5"/>'),
    none: '',
  },
  'jaffa-sun': {
    sun: svg('0 0 140 140', `<path class="ga-line" stroke-width="4" d="${rays(16, 40, 60, 70, 70)}"/><circle class="ga-fill" cx="70" cy="70" r="31"/><circle class="ga-ground" cx="70" cy="70" r="20"/><circle class="ga-fill2" cx="70" cy="70" r="11"/>`),
    olive: svg('0 0 140 140', `<path class="ga-line" stroke-width="3" d="M24 118C52 96 84 62 116 22"/>${[[44, 101, -20], [58, 86, 60], [72, 75, -10], [84, 58, 70], [96, 50, 0], [104, 34, 75]].map(([x, y, d]) => leaf(x!, y!, 26, 7, d!, 'ga-fill')).join('')}<circle class="ga-fill2" cx="52" cy="84" r="6"/><circle class="ga-fill2" cx="86" cy="72" r="6"/><circle class="ga-fill2" cx="100" cy="36" r="5"/>`),
    citrus: svg('0 0 140 140', `<circle class="ga-fill" cx="70" cy="70" r="50"/><circle class="ga-ground" cx="70" cy="70" r="42"/>${around(10, 0, 70, 70).map((_, i) => {
      const a1 = ((i * 36 - 90 + 4) * Math.PI) / 180, a2 = (((i + 1) * 36 - 90 - 4) * Math.PI) / 180
      return `<path class="ga-fill2" d="M${f(70 + 6 * Math.cos((a1 + a2) / 2))} ${f(70 + 6 * Math.sin((a1 + a2) / 2))}L${f(70 + 37 * Math.cos(a1))} ${f(70 + 37 * Math.sin(a1))}A37 37 0 0 1 ${f(70 + 37 * Math.cos(a2))} ${f(70 + 37 * Math.sin(a2))}Z"/>`
    }).join('')}<circle class="ga-ground" cx="70" cy="70" r="5"/>`),
  },
  'velvet-deco': {
    fan: svg('0 0 200 130', `<g class="ga-line ga-thin">${[78, 62, 46].map(r => `<path d="M${100 - r} 112A${r} ${r} 0 0 1 ${100 + r} 112"/>`).join('')}<path d="${rays(9, 14, 78, 100, 112, -72, 72)}"/><path d="M12 112V30h12v82M176 112V30h12v82M24 46h10M166 46h10M24 62h6M170 62h6"/><path d="M4 112H196"/></g>${diamond(100, 96, 12, 'ga-fill')}${diamond(100, 96, 5, 'ga-ground')}`),
    sunburst: svg('0 0 200 130', `<g class="ga-line ga-thin"><path d="${rays(17, 20, 100, 100, 118, -80, 80)}"/><path d="M60 118A40 40 0 0 1 140 118"/><path d="M0 118H200"/></g><path class="ga-fill" d="M76 118A24 24 0 0 1 124 118Z"/>`),
    diamond: svg('0 0 200 110', `<g class="ga-line ga-thin"><path d="M10 55H62M138 55H190M18 47H58M142 47H182M18 63H58M142 63H182"/></g>${diamond(100, 55, 40, 'ga-line ga-thin')}${diamond(100, 55, 28, 'ga-line ga-thin')}${diamond(100, 55, 14, 'ga-fill')}${diamond(70, 55, 6, 'ga-fill2')}${diamond(130, 55, 6, 'ga-fill2')}`),
  },
  herbarium: {
    eucalyptus: svg('0 0 150 170', `<path class="ga-line ga-thin" d="M72 166C70 120 64 70 84 8"/>${[[60, 140, 34], [84, 122, 30], [58, 102, 32], [82, 84, 28], [62, 64, 26], [86, 46, 24], [70, 28, 20]].map(([x, y, r], i) => `<ellipse class="${i % 2 ? 'ga-soft2' : 'ga-soft'}" cx="${x}" cy="${y}" rx="${r! / 2}" ry="${r! / 2.6}" transform="rotate(${i % 2 ? 24 : -24} ${x} ${y})"/><path class="ga-line ga-thin" d="M${x! + (i % 2 ? -10 : 10)} ${y! + 2}L${x} ${y}"/>`).join('')}`),
    lavender: svg('0 0 150 170', `<path class="ga-line ga-thin" d="M66 166C66 120 70 70 64 30M78 166C80 124 92 82 104 44"/>${Array.from({ length: 9 }, (_, i) => leaf(i % 2 ? 60 : 70, 32 + i * 7, 9, 4, i % 2 ? -30 : 30, 'ga-fill2')).join('')}${Array.from({ length: 7 }, (_, i) => leaf(i % 2 ? 99 : 108, 46 + i * 7, 8, 3.5, i % 2 ? -30 : 30, 'ga-fill3')).join('')}${leaf(56, 134, 30, 5, -30, 'ga-soft')}${leaf(88, 128, 28, 5, 34, 'ga-soft')}`),
    chamomile: svg('0 0 150 170', `<path class="ga-line ga-thin" d="M76 166C74 130 72 96 76 62M74 120C58 110 50 100 46 86"/>${around(12, 16, 76, 46).map(([x, y], i) => leaf(x, y, 20, 6, i * 30, 'ga-soft')).join('')}<circle class="ga-fill" cx="76" cy="46" r="9"/>${around(8, 9, 46, 72).map(([x, y], i) => leaf(x, y, 12, 4, i * 45, 'ga-soft2')).join('')}<circle class="ga-fill2" cx="46" cy="72" r="5"/>${leaf(88, 132, 26, 5, 40, 'ga-soft')}`),
  },
  'saffron-dunes': {
    sun: svg('0 0 280 140', '<circle class="ga-soft2" cx="150" cy="56" r="40"/><path class="ga-fill3" d="M0 112C60 72 110 92 150 98C200 106 240 76 280 84V140H0Z"/><path class="ga-fill" d="M0 122C70 100 120 118 180 112C220 108 250 96 280 104V140H0Z"/><path class="ga-fill2" d="M0 132C80 120 160 140 280 124V140H0Z"/>'),
    weave: svg('0 0 280 120', `${Array.from({ length: 7 }, (_, i) => diamond(32 + i * 36, 60, 16, i % 2 ? 'ga-fill2' : 'ga-line')).join('')}${Array.from({ length: 6 }, (_, i) => diamond(50 + i * 36, 60, 5, 'ga-fill')).join('')}<path class="ga-line ga-thin" d="M8 28H272M8 92H272"/><path class="ga-line2 ga-thin" stroke-dasharray="2 6" d="M8 20H272M8 100H272"/>`),
    stars: svg('0 0 280 130', `<path class="ga-fill2" d="M168 22a26 26 0 1 0 26 34 20 20 0 1 1-26-34Z"/>${[[60, 40, 10], [104, 22, 6], [228, 30, 8], [250, 74, 5], [36, 88, 6], [122, 70, 4]].map(([x, y, r]) => star4(x!, y!, r!, 'ga-fill')).join('')}<path class="ga-fill3" d="M0 112C70 92 120 104 170 100C220 96 250 86 280 92V130H0Z"/>`),
  },
  ma: {
    enso: svg('0 0 200 170', '<path class="ga-line" stroke-width="7" d="M150 52C138 30 112 20 86 26C52 34 34 66 42 98C50 130 84 148 118 140C140 134 154 118 158 100"/><path class="ga-line ga-thin" d="M150 34L182 16M156 42L178 30"/><rect class="ga-fill2" x="160" y="112" width="18" height="18"/><path class="ga-ground" d="M164 116h10v2h-4v8h-2v-8h-4z"/>'),
    branch: svg('0 0 200 170', `<path class="ga-line" stroke-width="3" d="M14 150C60 120 104 90 186 30"/><path class="ga-line ga-thin" d="M80 108C88 86 104 74 124 70M130 70C142 52 160 46 176 48"/>${[[124, 70], [176, 48], [98, 92], [152, 52]].map(([x, y]) => `${around(5, 6, x!, y!).map(([px, py]) => `<circle class="ga-soft2" cx="${px}" cy="${py}" r="5"/>`).join('')}<circle class="ga-fill2" cx="${x}" cy="${y}" r="2.5"/>`).join('')}<rect class="ga-fill2" x="20" y="16" width="16" height="16"/>`),
    fan: svg('0 0 200 150', `<path class="ga-soft" d="M100 132L24 58A108 108 0 0 1 176 58Z"/>${Array.from({ length: 9 }, (_, i) => {
      const a = ((-136 + i * 11.5) * Math.PI) / 180
      return `<path class="ga-line ga-thin" d="M100 132L${f(100 + 108 * Math.cos(a))} ${f(132 + 108 * Math.sin(a))}"/>`
    }).join('')}<path class="ga-line" stroke-width="2" d="M24 58A108 108 0 0 1 176 58"/><circle class="ga-fill2" cx="100" cy="132" r="5"/>`),
  },
  'postmarked-love': {
    heart: svg('0 0 200 120', `<g class="ga-line ga-thin"><path d="M18 60c8-10 16-10 24 0s16 10 24 0M18 72c8-10 16-10 24 0s16 10 24 0"/><path d="M144 46h40M144 60h40M144 74h40"/></g><rect class="ga-line" stroke-dasharray="3 4" x="62" y="12" width="76" height="96"/><rect class="ga-line ga-thin" x="72" y="22" width="56" height="76"/><circle class="ga-line ga-thin" cx="100" cy="60" r="20"/>${heart(100, 60, 1.25, 'ga-fill2')}`),
    flower: svg('0 0 200 120', `<g class="ga-line ga-thin"><path d="M18 60c8-10 16-10 24 0s16 10 24 0M18 72c8-10 16-10 24 0s16 10 24 0"/><path d="M144 46h40M144 60h40M144 74h40"/></g><rect class="ga-line" stroke-dasharray="3 4" x="62" y="12" width="76" height="96"/><rect class="ga-line ga-thin" x="72" y="22" width="56" height="76"/>${around(5, 11, 100, 58).map(([x, y]) => `<circle class="ga-soft2" cx="${x}" cy="${y}" r="8"/>`).join('')}<circle class="ga-fill2" cx="100" cy="58" r="6"/><path class="ga-line ga-thin" d="M100 70V92M100 84c6-6 10-6 14-4"/>`),
    asterisk: svg('0 0 200 120', `<g class="ga-line ga-thin"><path d="M30 60H76M124 60H170"/></g><circle class="ga-line" stroke-dasharray="2 4" cx="100" cy="60" r="38"/><circle class="ga-line ga-thin" cx="100" cy="60" r="30"/><path class="ga-line2" stroke-width="5" stroke-linecap="round" d="${rays(6, 0, 18, 100, 60)}"/>`),
  },
  'happy-accident': {
    stars: svg('0 0 260 130', `${star5(56, 50, 26, -12, 'ga-fill')}${star5(206, 84, 16, 14, 'ga-fill2')}<path class="ga-line2" stroke-width="5" d="M118 18c-14 10 14 22 0 34s14 24 0 36s12 20 0 30"/><path class="ga-line" stroke-width="5" d="M168 26c6-14 30-12 30 4 0 12-16 14-16 28"/><circle class="ga-fill3" cx="64" cy="108" r="9"/><path class="ga-line" stroke-width="3" d="M64 117V130"/>`),
    balloons: svg('0 0 260 140', `${[[86, 46, 'ga-fill', -8], [130, 34, 'ga-fill2', 0], [174, 50, 'ga-fill3', 8]].map(([x, y, c, d]) => `<ellipse class="${c}" cx="${x}" cy="${y}" rx="22" ry="27" transform="rotate(${d} ${x} ${y})"/><path class="ga-line ga-thin" d="M${x} ${Number(y) + 27}c-6 14 8 24 0 40s6 18 ${130 - Number(x)} 40"/>`).join('')}${star5(36, 30, 10, 10, 'ga-fill2')}${star5(228, 96, 9, -8, 'ga-fill')}`),
    squiggles: svg('0 0 260 120', '<path class="ga-line" stroke-width="5" d="M16 70c16-30 32 30 48 0s32 30 48 0s32 30 48 0"/><path class="ga-line2" stroke-width="5" d="M146 30c10-12 22 10 32-2s22 10 32-2s20 10 30-2"/><circle class="ga-fill2" cx="34" cy="28" r="8"/><circle class="ga-fill" cx="214" cy="84" r="10"/><circle class="ga-fill3" cx="184" cy="100" r="5"/><circle class="ga-fill3" cx="58" cy="102" r="6"/>'),
  },
  'jerusalem-stone': {
    pomegranate: svg('0 0 140 140', `<path class="ga-line" stroke-width="2" d="M58 34l-6-14 12 8 6-12 6 12 12-8-6 14"/><path class="ga-soft" d="M70 32C38 32 26 62 30 86c4 26 22 42 40 42s36-16 40-42c4-24-8-54-40-54Z"/><path class="ga-line" stroke-width="2" d="M70 32C38 32 26 62 30 86c4 26 22 42 40 42s36-16 40-42c4-24-8-54-40-54Z"/>${[[56, 72], [70, 66], [84, 72], [50, 88], [63, 84], [77, 84], [90, 88], [56, 102], [70, 98], [84, 102], [63, 114], [77, 114]].map(([x, y]) => `<circle class="ga-fill2" cx="${x}" cy="${y}" r="4"/>`).join('')}`),
    olive: svg('0 0 140 140', `<path class="ga-line" stroke-width="2" d="M70 130V18"/>${[[58, 106, -50], [82, 94, 50], [58, 82, -50], [82, 70, 50], [58, 58, -50], [82, 46, 50], [70, 22, 0]].map(([x, y, d]) => leaf(x!, y!, 24, 6, d!, 'ga-fill')).join('')}<circle class="ga-fill2" cx="88" cy="112" r="5"/><circle class="ga-fill2" cx="52" cy="70" r="5"/>`),
    star: svg('0 0 140 140', '<g class="ga-line" stroke-width="2"><path d="M70 18L115 96H25Z"/><path d="M70 122L25 44H115Z"/><circle cx="70" cy="70" r="58"/></g><circle class="ga-fill2" cx="70" cy="70" r="7"/>'),
  },
  'golden-hour-groove': {
    rainbow: svg('0 0 220 150', '<path class="ga-fill" d="M10 150V110A100 100 0 0 1 210 110V150H184V110A74 74 0 0 0 36 110V150Z"/><path class="ga-fill2" d="M36 150V110A74 74 0 0 1 184 110V150H160V110A50 50 0 0 0 60 110V150Z"/><path class="ga-fill3" d="M60 150V110A50 50 0 0 1 160 110V150H138V110A28 28 0 0 0 82 110V150Z"/><circle class="ga-fill2" cx="110" cy="104" r="14"/>'),
    flower: svg('0 0 160 160', `${around(6, 34, 80, 80).map(([x, y]) => `<circle class="ga-fill" cx="${x}" cy="${y}" r="26"/>`).join('')}<circle class="ga-ground" cx="80" cy="80" r="26"/><circle class="ga-fill2" cx="80" cy="80" r="18"/>`),
    record: svg('0 0 160 160', '<circle class="ga-ink" cx="80" cy="80" r="66"/><g class="ga-line ga-thin" opacity="0.6"><circle cx="80" cy="80" r="56"/><circle cx="80" cy="80" r="48"/><circle cx="80" cy="80" r="40"/></g><circle class="ga-fill2" cx="80" cy="80" r="22"/><circle class="ga-fill" cx="80" cy="80" r="12"/><circle class="ga-ground" cx="80" cy="80" r="3"/>'),
  },
}

// ------------------------------------------------------------------- dividers
// The small mark between sections. One per style; Still's follows its divider option.

export const DIVIDERS: Record<string, string> = {
  'still': '',
  'jaffa-sun': svg('0 0 120 20', `<path class="ga-line ga-thin" d="M4 10H44M76 10H116"/>${diamond(60, 10, 7, 'ga-fill')}`),
  'velvet-deco': svg('0 0 160 20', `<path class="ga-line ga-thin" d="M4 10H64M96 10H156M24 4H56M104 4H136"/>${diamond(80, 10, 8, 'ga-fill')}`),
  'herbarium': svg('0 0 120 24', `<path class="ga-line2 ga-thin" d="M10 12H110"/>${leaf(60, 12, 14, 4, 90, 'ga-soft')}`),
  'saffron-dunes': svg('0 0 140 16', Array.from({ length: 7 }, (_, i) => diamond(16 + i * 18, 8, 5, i % 2 ? 'ga-fill2' : 'ga-line')).join('')),
  'ma': svg('0 0 120 10', '<path class="ga-line ga-thin" d="M4 5H70"/><rect class="ga-fill2" x="76" y="1" width="8" height="8"/>'),
  'postmarked-love': svg('0 0 140 20', `<path class="ga-line ga-thin" d="M4 7H56M84 7H136M4 13H56M84 13H136"/>${heart(70, 9, 0.7, 'ga-fill2')}`),
  'happy-accident': svg('0 0 120 24', '<path class="ga-line" stroke-width="4" d="M10 12c10-10 20 10 30 0s20 10 30 0s20 10 30 0"/>'),
  'jerusalem-stone': svg('0 0 140 20', '<path class="ga-line" stroke-width="1.5" d="M4 10H52M88 10H136"/><circle class="ga-fill2" cx="62" cy="10" r="3"/><circle class="ga-fill2" cx="70" cy="10" r="3"/><circle class="ga-fill2" cx="78" cy="10" r="3"/>'),
  'golden-hour-groove': svg('0 0 120 24', '<rect class="ga-fill" x="10" y="9" width="30" height="6" rx="3"/><rect class="ga-fill2" x="45" y="9" width="30" height="6" rx="3"/><rect class="ga-fill3" x="80" y="9" width="30" height="6" rx="3"/>'),
}

// ------------------------------------------------------------------ backdrops
// Art that belongs to the page rather than the top: tiles, fringes, bands, doodles, masonry.

const tile = (cls: string) => svg('0 0 40 40', `<rect class="ga-line" stroke-width="2" x="2" y="2" width="36" height="36"/><path class="ga-line" stroke-width="2" d="M20 2V38M2 20H38"/>${diamond(20, 20, 5, cls)}`)
const fringe = (n: number) => svg(`0 0 ${n * 20} 20`, Array.from({ length: n }, (_, i) => diamond(10 + i * 20, 10, 6, 'ga-line ga-thin')).join(''), 'g-row')
const doodles = (count: number) => {
  const spots: [number, number, number, string][] = [[6, 12, 22, 'ga-soft'], [92, 26, 28, 'ga-soft2'], [4, 64, 18, 'ga-soft2'], [94, 76, 24, 'ga-soft'], [10, 92, 16, 'ga-soft'], [88, 50, 12, 'ga-soft2']]
  return spots.slice(0, count).map(([x, y, r, c], i) =>
    `<span class="g-blob" style="inset-inline-start:${x}%;top:${y}%;width:${r * 0.25}rem">${svg('0 0 100 100', i % 3 === 2 ? star5(50, 50, 44, i * 20, c) : `<path class="${c}" d="M50 6C76 6 96 24 94 52C92 80 70 96 46 94C22 92 4 74 6 48C8 24 26 6 50 6Z"/>`)}</span>`).join('')
}

/** The page's backdrop pieces for a style and its options (positioned by gallery.css). */
export function backdrop(look: string, options: Record<string, string>): string {
  switch (look) {
    case 'jaffa-sun': return `<span class="g-tile g-tile-a">${tile('ga-fill')}</span><span class="g-tile g-tile-b">${tile('ga-fill2')}</span>`
    case 'saffron-dunes': return options.border === 'fringe' ? `<span class="g-fringe">${fringe(16)}</span>` : ''
    case 'happy-accident': return doodles(({ subtle: 2, medium: 4, lively: 6 } as Record<string, number>)[options.density ?? 'subtle'] ?? 2)
    case 'jerusalem-stone': return options.masonry === 'courses'
      ? `<span class="g-courses">${svg('0 0 300 40', '<g class="ga-line ga-thin"><rect x="2" y="2" width="296" height="36"/><path d="M76 2V38M150 2V38M224 2V38"/></g>')}</span>`
      : ''
    default: return ''
  }
}

/** The emblem for a style and its options, or '' when the couple chose none. */
export function emblem(look: string, options: Record<string, string>): string {
  const set = EMBLEMS[look]
  if (!set) return ''
  const pick = ({
    'still': options.divider,
    'jaffa-sun': options.tile,
    'velvet-deco': options.crest,
    'herbarium': options.specimen,
    'saffron-dunes': options.horizon,
    'ma': options.mark,
    'postmarked-love': options.stamp,
    'happy-accident': options.doodles,
    'jerusalem-stone': options.emblem,
    'golden-hour-groove': options.groove,
  } as Record<string, string | undefined>)[look]
  return set[pick ?? ''] ?? Object.values(set)[0] ?? ''
}

/** The divider between sections. */
export function divider(look: string, options: Record<string, string>): string {
  if (look === 'still') return options.divider === 'none' ? '' : (options.divider === 'dots' ? EMBLEMS.still!.dots! : svg('0 0 120 10', '<path class="ga-line2 ga-thin" d="M30 5H90"/>'))
  return DIVIDERS[look] ?? ''
}
