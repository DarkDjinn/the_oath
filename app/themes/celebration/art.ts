/**
 * The celebration collection's art: one drawing per style, built from the style's options.
 *
 * Like the gallery's art (../gallery/art.ts), every drawing is fixed markup from this file and
 * never contains campaign data, so it is safe for `v-html`; colours come from the `ga-*`
 * classes in gallery.css, which read the couple's six colours.
 */
import { around, diamond, f, heart, leaf, rays, star4, star5, svg } from '../gallery/art'

type Options = Record<string, string>
const W = 340

/** The same drawing and its mirror image, for symmetric compositions. */
const mirror = (body: string) => `<g>${body}</g><g transform="matrix(-1 0 0 1 ${W} 0)">${body}</g>`
const pick = <T>(set: Record<string, T>, key: string | undefined) => set[key ?? ''] ?? Object.values(set)[0]!

/** A pomegranate centred on (x, y): body, crown and seeds. */
const pomegranate = (x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">`
  + '<path class="ga-soft2" d="M0-18C14-18 22-6 22 6 22 20 12 28 0 28S-22 20-22 6-14-18 0-18Z"/>'
  + '<path class="ga-line" d="M0-18C14-18 22-6 22 6 22 20 12 28 0 28S-22 20-22 6-14-18 0-18ZM-7-17-5-27 0-20 5-27 7-17"/>'
  + [[-7, 4], [0, 10], [7, 4], [0, -2], [-5, 17], [6, 17]].map(([a, b]) => `<circle class="ga-fill" cx="${a}" cy="${b}" r="2.4"/>`).join('')
  + '</g>'
/** A round flower of `n` petals. */
const flower = (x: number, y: number, r: number, n = 8, centre = 'ga-fill2') =>
  around(n, r * 0.62, x, y).map(([a, b]) => `<circle class="ga-soft" cx="${a}" cy="${b}" r="${f(r * 0.4)}"/><circle class="ga-line ga-thin" cx="${a}" cy="${b}" r="${f(r * 0.4)}"/>`).join('')
  + `<circle class="${centre}" cx="${x}" cy="${y}" r="${f(r * 0.32)}"/>`
/** An eighth note. */
const note = (x: number, y: number, cls = 'ga-fill') =>
  `<path class="ga-line" stroke-width="2.6" d="M${x + 7} ${y}V${y - 28}Q${x + 16} ${y - 22} ${x + 18} ${y - 12}"/><ellipse class="${cls}" cx="${x}" cy="${y}" rx="8" ry="5.6" transform="rotate(-20 ${x} ${y})"/>`
/** Two beamed notes. */
const notes2 = (x: number, y: number) =>
  `<path class="ga-line" stroke-width="3" d="M${x + 6} ${y}V${y - 30}L${x + 19} ${y - 34}V${y - 4}"/><ellipse class="ga-fill" cx="${x}" cy="${y + 2}" rx="8" ry="5.6"/><ellipse class="ga-fill2" cx="${x + 13}" cy="${y - 2}" rx="8" ry="5.6"/>`
/** A firework burst. */
const burst = (x: number, y: number, r: number, cls: string) =>
  `<path class="${cls}" stroke-width="2" d="${rays(16, r * 0.25, r, x, y)}"/><circle class="${cls.replace('line', 'fill')}" cx="${x}" cy="${y}" r="${f(r * 0.14)}"/>`
/** A crystal drop hanging from (x, y). */
const drop = (x: number, y: number, s = 1) =>
  `<path class="ga-line ga-thin" d="M${x} ${y}v${f(16 * s)}"/><path class="ga-soft2" d="M${x} ${f(y + 15 * s)}l${f(7 * s)} ${f(14 * s)}-${f(7 * s)} ${f(15 * s)}-${f(7 * s)}-${f(15 * s)}Z"/><path class="ga-line2 ga-thin" d="M${x} ${f(y + 15 * s)}l${f(7 * s)} ${f(14 * s)}-${f(7 * s)} ${f(15 * s)}-${f(7 * s)}-${f(15 * s)}Z"/>`

// ------------------------------------------------------------------------ emblems

function papercut(o: Options) {
  const crest = `<path class="ga-fill" d="M170 18l14 17h-28Z"/><circle class="ga-line2" stroke-width="3" cx="170" cy="58" r="22"/>${star5(170, 59, 15, 0, 'ga-fill2')}`
  const garland = `<path class="ga-line" d="M12 96Q170 196 328 96"/>${[44, 78, 114, 152].map((x) => {
    const t = (x - 12) / 316, y = (1 - t) ** 2 * 96 + 2 * (1 - t) * t * 196 + t * t * 96
    return diamond(x, f(y), 5, 'ga-fill2') + diamond(W - x, f(y), 5, 'ga-fill2')
  }).join('')}`
  const motif = pick({
    doves: mirror('<path class="ga-soft2" d="M138 97Q93 41 70 78Q80 101 109 104Q92 117 74 112Q103 142 143 111Z"/><path class="ga-line" d="M138 97Q93 41 70 78Q80 101 109 104Q92 117 74 112Q103 142 143 111ZM116 83Q95 53 76 53Q73 74 100 88M114 97 78 104"/><circle class="ga-fill" cx="87" cy="77" r="2.7"/><path class="ga-fill" d="M67 77l-13 3 13 7Z"/>')
      + mirror(`${leaf(112, 150, 22, 6, -60, 'ga-fill2')}${leaf(132, 152, 22, 6, -110, 'ga-fill2')}<circle class="ga-fill" cx="122" cy="146" r="4"/>`),
    pomegranates: mirror(`${pomegranate(100, 92, 1.25)}${leaf(130, 70, 26, 7, 40, 'ga-fill2')}${leaf(70, 66, 24, 6, -40, 'ga-fill2')}${diamond(58, 128, 6, 'ga-fill')}`),
    floral: mirror(`${flower(96, 96, 30)}${flower(56, 60, 14, 6, 'ga-fill')}${flower(132, 132, 12, 6, 'ga-fill')}${leaf(130, 84, 22, 6, 60, 'ga-fill2')}`),
  }, o.papercut)
  return svg('0 0 340 190', crest + garland + motif)
}

function chuppah(o: Options) {
  const posts = '<path class="ga-line" stroke-width="5" d="M34 166V52M306 166V52"/><path class="ga-line2" stroke-width="3" d="M26 166H42M298 166H314"/>'
  const canopy = pick({
    scalloped: '<path class="ga-soft2" d="M22 42Q71 20 114 36Q171 12 226 36Q278 20 318 42L306 78Q278 56 251 72Q214 89 171 68Q115 92 79 71Q49 54 34 78Z"/><path class="ga-line" stroke-width="2.5" d="M22 42Q71 20 114 36Q171 12 226 36Q278 20 318 42L306 78Q278 56 251 72Q214 89 171 68Q115 92 79 71Q49 54 34 78Z"/>',
    striped: Array.from({ length: 10 }, (_, i) => {
      const t1 = 22 + i * 29.6, t2 = t1 + 29.6, b1 = 34 + i * 27.2, b2 = b1 + 27.2
      return `<path class="${i % 2 ? 'ga-fill2' : 'ga-ground'}" d="M${f(t1)} 34H${f(t2)}L${f(b2)} 74H${f(b1)}Z"/>`
    }).join('') + '<path class="ga-line" stroke-width="2.5" d="M22 34H318L306 74H34Z"/><path class="ga-line" d="M34 74q17 12 34 0t34 0 34 0 34 0 34 0 34 0 34 0 34 0"/>',
    floral: '<path class="ga-line" stroke-width="2.5" d="M22 40Q170 82 318 40M22 40H318"/>' + [60, 115, 170, 225, 280].map((x, i) => `${flower(x, i === 2 ? 58 : (i % 2 ? 52 : 47), i === 2 ? 16 : 12, 8, i % 2 ? 'ga-fill' : 'ga-fill2')}`).join(''),
  }, o.canopy)
  const xs = [52, 80, 108, 136, 164, 192, 220, 248, 276]
  const hanging = pick({
    ribbons: xs.map((x, i) => `<path class="${i % 2 ? 'ga-line' : 'ga-line2'} ga-thin" d="M${x} 80q-4 14 2 24q5 8 0 16"/><circle class="${i % 2 ? 'ga-fill' : 'ga-fill2'}" cx="${x + 2}" cy="${i % 2 ? 106 : 122}" r="4"/>`).join(''),
    lanterns: [70, 120, 170, 220, 270].map((x, i) => `<path class="ga-line ga-thin" d="M${x} 80V${i % 2 ? 94 : 102}"/><rect class="${i % 2 ? 'ga-fill2' : 'ga-fill'}" x="${x - 9}" y="${i % 2 ? 94 : 102}" width="18" height="24" rx="8"/><path class="ga-ground" d="M${x - 5} ${(i % 2 ? 94 : 102) + 6}h10v2h-10zM${x - 5} ${(i % 2 ? 94 : 102) + 14}h10v2h-10z"/>`).join(''),
    petals: xs.map((x, i) => `<path class="ga-line ga-thin" d="M${x} 80V${110 + (i % 3) * 8}"/>${[0, 1, 2].map(k => `<circle class="${(i + k) % 2 ? 'ga-fill' : 'ga-fill2'}" cx="${x}" cy="${92 + k * 10 + (i % 3) * 3}" r="3.4"/>`).join('')}`).join(''),
  }, o.hanging)
  const swags = '<path class="ga-line2" d="M34 132Q77 149 114 121M306 132Q263 149 226 121"/>'
  return svg('0 0 340 190', posts + canopy + hanging + swags)
}

function sevenBlessings(o: Options) {
  // Always seven, as a 4 + 3 cluster so they stay large on a phone.
  const spots = [[80, 44], [140, 40], [200, 40], [260, 44], [110, 102], [170, 106], [230, 102]] as const
  const medal = pick<(x: number, y: number, i: number) => string>({
    rosettes: (x, y, i) => `<circle class="ga-plate" cx="${x}" cy="${y}" r="24"/><circle class="ga-line" cx="${x}" cy="${y}" r="24"/><circle class="ga-line2 ga-thin" cx="${x}" cy="${y}" r="19"/><text class="ga-ink" x="${x}" y="${y + 7}" text-anchor="middle" font-size="20" style="font-family:var(--font-numeral)">${i + 1}</text>`,
    facets: (x, y, i) => {
      const pts = around(8, 24, x, y, -67.5).map(p => p.join(' ')).join('L')
      return `<path class="${i % 2 ? 'ga-soft' : 'ga-soft2'}" d="M${pts}Z"/><path class="ga-line" d="M${pts}Z"/><path class="ga-line ga-thin" d="M${x - 12} ${y - 6}H${x + 12}L${x} ${y + 16}ZM${x - 12} ${y - 6}L${x} ${y - 22}L${x + 12} ${y - 6}"/>`
    },
    stars: (x, y, i) => `${star5(x, y, 18, 0, i % 2 ? 'ga-fill2' : 'ga-fill')}${star4(x + 20, y - 16, 5, 'ga-fill')}`,
  }, o.medallions)
  const beads = '<path class="ga-line ga-thin" d="M50 150Q170 196 290 150"/>' + [0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9].map((t) => {
    const x = (1 - t) ** 2 * 50 + 2 * (1 - t) * t * 170 + t * t * 290, y = (1 - t) ** 2 * 150 + 2 * (1 - t) * t * 196 + t * t * 150
    return `<circle class="ga-fill2" cx="${f(x)}" cy="${f(y)}" r="3"/>`
  }).join('')
  return svg('0 0 340 190', spots.map(([x, y], i) => medal(x, y, i)).join('') + beads)
}

function rimon(o: Options) {
  const frame = '<rect class="ga-plate" x="16" y="10" width="308" height="170"/><rect class="ga-line" stroke-width="3" x="16" y="10" width="308" height="170"/>'
  const along = (step: number, draw: (x: number, y: number, i: number) => string) => {
    let out = ''
    for (let x = 36, i = 0; x <= 306; x += step, i++) out += draw(x, 28, i) + draw(x, 162, i)
    return out
  }
  const tiles = pick({
    diamonds: along(27, (x, y, i) => diamond(x, y, 7, i % 2 ? 'ga-fill2' : 'ga-fill3')) + [60, 95, 130].map(y => diamond(36, y, 6, 'ga-fill2') + diamond(304, y, 6, 'ga-fill2')).join(''),
    flowers: along(45, (x, y, i) => flower(x, y, 11, 8, i % 2 ? 'ga-fill' : 'ga-fill2')),
    arches: along(30, (x, y, i) => `<path class="${i % 2 ? 'ga-line' : 'ga-line2'}" d="M${x - 11} ${y + 9}V${y}a11 11 0 0 1 22 0V${y + 9}"/>`),
  }, o.tiles)
  const fruit = pick({
    rimon: pomegranate(130, 92, 1.5) + pomegranate(210, 92, 1.5) + diamond(170, 95, 10, 'ga-fill'),
    branches: `<path class="ga-line" stroke-width="3" d="M70 130Q170 50 270 130"/>${[[110, 92], [170, 72], [230, 92]].map(([x, y]) => pomegranate(x!, y! + 20, 1)).join('')}${[[88, 112, -50], [140, 82, -20], [200, 82, 20], [252, 112, 50]].map(([x, y, d]) => leaf(x!, y!, 24, 7, d!, 'ga-fill2')).join('')}`,
    none: `<rect class="ga-fill" x="140" y="65" width="60" height="60" transform="rotate(45 170 95)"/><rect class="ga-fill2" x="140" y="65" width="60" height="60"/>${flower(170, 95, 18, 8, 'ga-ground')}`,
  }, o.fruit)
  return svg('0 0 340 190', frame + tiles + fruit)
}

function klezmer(o: Options) {
  const staff = '<path class="ga-line2" stroke-width="5" d="M22 126Q91 34 172 108T321 63"/><path class="ga-line" d="M18 142Q98 52 170 135T321 88"/>'
  const instrument = pick({
    violin: '<path class="ga-soft2" d="M142 68C119 56 109 82 127 96C111 110 125 145 151 136Q166 146 177 132Q194 115 177 95Q192 75 174 65Q161 59 152 76Z"/><path class="ga-line" stroke-width="2.5" d="M142 68C119 56 109 82 127 96C111 110 125 145 151 136Q166 146 177 132Q194 115 177 95Q192 75 174 65Q161 59 152 76Z"/><path class="ga-line" stroke-width="3" d="M154 102 180 24M110 50 210 120"/><circle class="ga-line" cx="182" cy="20" r="6"/><path class="ga-line ga-thin" d="M146 112c4 6 10 6 14 0"/>',
    clarinet: '<g transform="rotate(-35 170 90)"><rect class="ga-soft2" x="112" y="82" width="116" height="16" rx="6"/><rect class="ga-line" x="112" y="82" width="116" height="16" rx="6"/><path class="ga-fill2" d="M228 80l26-10v40l-26-10Z"/><path class="ga-line" d="M228 80l26-10v40l-26-10ZM100 86h12v8h-12Z"/>' + [130, 148, 166, 184, 202].map(x => `<circle class="ga-fill" cx="${x}" cy="90" r="3.6"/>`).join('') + '</g>',
    accordion: '<rect class="ga-fill2" x="112" y="56" width="26" height="70" rx="4"/><rect class="ga-fill2" x="202" y="56" width="26" height="70" rx="4"/><path class="ga-soft" d="M138 60L148 126 158 60 168 126 178 60 188 126 202 60V122L188 56 178 122 168 56 158 122 148 56 138 122Z"/><path class="ga-line" d="M138 60L148 126 158 60 168 126 178 60 188 126 202 60M112 56h26v70h-26ZM202 56h26v70h-26Z"/>' + [64, 78, 92, 106].map(y => `<rect class="ga-ground" x="118" y="${y}" width="14" height="7" rx="2"/><circle class="ga-ground" cx="215" cy="${y + 3}" r="3.4"/>`).join(''),
  }, o.instrument)
  const ns = notes2(52, 58) + note(84, 122, 'ga-fill2') + notes2(244, 48) + note(286, 126)
  return svg('0 0 340 190', staff + instrument + ns)
}

function fireworks(o: Options) {
  const spots = [[86, 62, 34, 'ga-line'], [170, 44, 30, 'ga-line2'], [254, 66, 36, 'ga-line']] as const
  const bursts = pick({
    starbursts: spots.map(([x, y, r, c]) => `<g class="c-twinkle">${burst(x, y, r, c)}</g>`).join('') + star4(130, 100, 6, 'ga-fill') + star4(214, 108, 5, 'ga-fill2'),
    comets: spots.map(([x, y, r, c], i) => `<path class="${c}" stroke-width="2" d="M${x - 30 + i * 10} 150Q${x - 18} ${y + 40} ${x} ${y}"/>${star4(x, y, r * 0.4, c.replace('line', 'fill'))}<g class="c-twinkle">${star4(x + 16, y - 12, 4, 'ga-fill')}</g>`).join(''),
    sparkles: spots.map(([x, y, r], i) => `<g class="c-twinkle">${around(12, r, x, y).map(([a, b], k) => `<circle class="${(k + i) % 2 ? 'ga-fill' : 'ga-fill2'}" cx="${a}" cy="${b}" r="${k % 3 ? 2.2 : 3.4}"/>`).join('')}${around(6, r * 0.5, x, y, -60).map(([a, b]) => `<circle class="ga-fill" cx="${a}" cy="${b}" r="1.8"/>`).join('')}</g>${star4(x, y, 7, 'ga-fill2')}`).join(''),
  }, o.burst)
  const skyline = pick({
    city: '<path class="ga-line2" stroke-width="2.5" d="M14 182V160H40V146H64V166H84V136H110V158H128V150H150V170H170V140H198V160H214V148H240V168H258V134H284V156H302V146H326V182"/>' + [[95, 146], [272, 144], [180, 150]].map(([x, y]) => `<rect class="ga-fill" x="${x}" y="${y}" width="4" height="5"/>`).join(''),
    hills: '<path class="ga-soft" d="M0 190V164Q60 136 130 162T260 152 340 160V190Z"/><path class="ga-line2" stroke-width="2.5" d="M0 164Q60 136 130 162T260 152 340 160"/>',
    none: '',
  }, o.skyline)
  return svg('0 0 340 190', bursts + skyline)
}

function poolside(o: Options) {
  const sunRays = (x: number, y: number, r: number) => `<path class="ga-line" stroke-width="2.5" d="${rays(12, r + 8, r + 18, x, y)}"/><circle class="ga-soft2" cx="${x}" cy="${y}" r="${r}"/><circle class="ga-line" stroke-width="3" cx="${x}" cy="${y}" r="${r}"/>`
  const umbrella = (x: number) => `<path class="ga-fill2" d="M${x - 46} 110Q${x} 39 ${x + 46} 110Z"/><path class="ga-ground" d="M${x - 14} 110Q${x - 12} 58 ${x} 53Q${x - 4} 70 ${x - 2} 110Z"/><path class="ga-line" stroke-width="2.5" d="M${x - 46} 110Q${x} 39 ${x + 46} 110ZM${x} 53V158q0 14 13 7"/>`
  const icon = pick({
    umbrella: sunRays(80, 52, 26) + umbrella(262),
    sun: sunRays(170, 58, 36) + '<circle class="ga-ink" cx="158" cy="52" r="3.4"/><circle class="ga-ink" cx="182" cy="52" r="3.4"/><path class="ga-ink-line" stroke-width="3" d="M154 66q16 14 32 0"/>',
    flamingo: sunRays(78, 50, 24) + '<path class="ga-fill2" d="M226 96c-6-22 18-34 36-24 12 7 14 22 4 30-9 7-25 6-34 0Z"/><path class="ga-line2" stroke-width="3.5" d="M264 76C276 56 270 36 256 34c-10-1-14 8-10 14"/><path class="ga-fill" d="M244 48l-10 10 8-1Z"/><path class="ga-line2" stroke-width="2.5" d="M244 102V140M252 102l6 16-10 6"/>',
  }, o['summer-icon'])
  const water = pick({
    ripples: [[118, 'ga-line2', 2], [140, 'ga-line', 2], [162, 'ga-line2', 3], [182, 'ga-line', 2]].map(([y, c, w]) => `<path class="${c}" stroke-width="${w}" d="M-10 ${y}Q29 ${Number(y) - 19} 67 ${y}T145 ${y}T223 ${y}T301 ${y}T378 ${y}"/>`).join(''),
    waves: '<path class="ga-soft" d="M-10 130Q30 108 70 130T150 130T230 130T310 130T390 130V200H-10Z"/><path class="ga-soft" d="M-10 156Q30 136 70 156T150 156T230 156T310 156T390 156V200H-10Z"/><path class="ga-line" stroke-width="2.5" d="M-10 130Q30 108 70 130T150 130T230 130T310 130T390 130"/><path class="ga-line2" stroke-width="2.5" d="M-10 156Q30 136 70 156T150 156T230 156T310 156T390 156"/>',
    tiles: Array.from({ length: 2 }, (_, r) => Array.from({ length: 11 }, (_, c) => `<rect class="${(r + c) % 2 ? 'ga-soft' : 'ga-plate'}" x="${4 + c * 30}" y="${130 + r * 30}" width="30" height="30"/>`).join('')).join('') + '<path class="ga-line ga-thin" d="M4 130H334M4 160H334M4 190H334M34 130V190M64 130V190M94 130V190M124 130V190M154 130V190M184 130V190M214 130V190M244 130V190M274 130V190M304 130V190"/><path class="ga-line2" stroke-width="2.5" d="M-10 124Q29 108 67 124T145 124T223 124T301 124T378 124"/>',
  }, o.water)
  return svg('0 0 340 190', icon + water)
}

const confettiBit = (kind: string, x: number, y: number, i: number) => ({
  discs: `<circle class="${i % 2 ? 'ga-fill2' : 'ga-fill'}" cx="${x}" cy="${y}" r="${i % 3 ? 4.5 : 6}"/>`,
  diamonds: diamond(x, y, i % 3 ? 5 : 7, i % 2 ? 'ga-fill' : 'ga-fill2'),
  stars: star5(x, y, i % 3 ? 6 : 8, i * 17, i % 2 ? 'ga-fill2' : 'ga-fill'),
}[kind] ?? '')

function couture(o: Options) {
  const ribbon = pick({
    bow: '<path class="ga-soft2" d="M168 91C75 6 48 62 88 88C117 110 144 102 168 91C200 50 249 33 269 70C279 101 239 121 168 91Z"/><path class="ga-line" stroke-width="2.8" d="M168 91C75 6 48 62 88 88C117 110 144 102 168 91C200 50 249 33 269 70C279 101 239 121 168 91Z"/><path class="ga-soft2" d="M168 94l-36 76 22-10 18 15 12-77 35 65 3-23 26 9-52-66"/><path class="ga-line" stroke-width="2.5" d="M168 94l-36 76 22-10 18 15 12-77 35 65 3-23 26 9-52-66"/><rect class="ga-fill" x="153" y="78" width="35" height="30" rx="8" transform="rotate(-8 170 93)"/>',
    loops: '<path class="ga-line" stroke-width="5" d="M30 60C70 10 110 120 80 120S90 30 150 50 170 130 140 120 190 30 230 60 240 130 210 120 260 40 310 70"/>' + '<path class="ga-line2" stroke-width="2" d="M30 70C70 20 110 130 80 130S90 40 150 60 170 140 140 130 190 40 230 70 240 140 210 130 260 50 310 80"/>',
    streamers: [[60, 'ga-line'], [110, 'ga-line2'], [170, 'ga-line'], [230, 'ga-line2'], [280, 'ga-line']].map(([x, c], i) => `<path class="${c}" stroke-width="4" d="M${x} 0C${Number(x) + 22} 30 ${Number(x) - 22} 60 ${x} ${90 + (i % 2) * 30}S${Number(x) + 10} ${150 + (i % 2) * 10} ${Number(x) - 6} ${170 - (i % 3) * 14}"/>`).join(''),
  }, o.ribbons)
  const spots = [[25, 53], [53, 128], [93, 25], [277, 25], [300, 118], [323, 57], [44, 162], [292, 166], [12, 100], [328, 150]]
  return svg('0 0 340 190', ribbon + spots.map(([x, y], i) => confettiBit(o.confetti ?? 'diamonds', x!, y!, i)).join(''))
}

function gala(o: Options) {
  const drape = pick({
    curtain: '<path class="ga-soft2" d="M0 0H40Q60 60 34 150L16 186H0Z"/><path class="ga-soft2" d="M340 0H300Q280 60 306 150L324 186H340Z"/><path class="ga-line2" d="M40 0Q60 60 34 150L16 186M300 0Q280 60 306 150L324 186"/><path class="ga-line" d="M22 120q14 6 28 0M318 120q-14 6-28 0"/>',
    swags: '<path class="ga-soft2" d="M0 0H340V8Q298 44 255 8Q212 44 170 8Q128 44 85 8Q42 44 0 8Z"/><path class="ga-line2" d="M0 8Q42 44 85 8T170 8 255 8 340 8"/>' + [85, 170, 255].map(x => `<path class="ga-line ga-thin" d="M${x} 8v16"/><path class="ga-fill" d="M${x - 4} 24h8l3 12h-14Z"/>`).join(''),
    clean: '',
  }, o.drapery)
  const arms = '<path class="ga-line" stroke-width="3" d="M170 10V48M93 65Q170 123 247 65M120 92Q170 134 220 92"/><path class="ga-line" d="M91 59Q170 98 249 59M112 86Q170 105 228 86"/>'
  const hangs = [[93, 65], [120, 92], [145, 110], [170, 117], [195, 110], [220, 92], [247, 65]] as const
  const light = pick({
    crystal: arms + hangs.map(([x, y]) => drop(x, y)).join('') + `<path class="ga-line2" stroke-width="1.8" d="${rays(10, 8, 15, 170, 31)}"/>`,
    orb: arms + hangs.map(([x, y], i) => `<path class="ga-line ga-thin" d="M${x} ${y}v14"/><circle class="ga-soft2" cx="${x}" cy="${y + 22}" r="${i === 3 ? 10 : 8}"/><circle class="ga-line2" cx="${x}" cy="${y + 22}" r="${i === 3 ? 10 : 8}"/><circle class="ga-ground" cx="${x - 3}" cy="${y + 19}" r="2"/>`).join(''),
    tiered: '<path class="ga-line" stroke-width="3" d="M170 6V40"/>' + [[40, 46], [74, 74], [108, 102]].map(([y, w]) => `<path class="ga-line" stroke-width="2.5" d="M${170 - w!} ${y}Q170 ${y! + 22} ${170 + w!} ${y}"/>${[-1, -0.5, 0, 0.5, 1].map(t => `<path class="ga-fill2" d="M${f(170 + t * w! - 2)} ${y! - 12}h4v10h-4Z"/><path class="ga-fill" d="M${f(170 + t * w!)} ${y! - 20}q4 5 0 8q-4-3 0-8Z"/>`).join('')}`).join('') + [100, 136, 170, 204, 240].map(x => drop(x, 118, 0.8)).join(''),
  }, o.chandelier)
  return svg('0 0 340 190', drape + light)
}

function neon(o: Options) {
  const shapes: Record<string, string> = {
    heart: 'M170 148C110 104 52 76 84 43C112 9 157 28 170 51C196 14 242 18 261 51C281 87 222 113 170 148Z',
    infinity: 'M170 86C140 46 82 46 82 86S140 126 170 86 258 46 258 86 200 126 170 86Z',
    star: (() => { const p = around(10, 0, 170, 82).map((_, i) => { const r = i % 2 ? 26 : 64, a = ((i * 36 - 90) * Math.PI) / 180; return `${f(170 + r * Math.cos(a))} ${f(82 + r * Math.sin(a))}` }); return `M${p.join('L')}Z` })(),
  }
  const d = pick(shapes, o['neon-shape'])
  const inner = o['neon-shape'] === 'star' ? `<path class="ga-line2" stroke-width="2" d="${(() => { const p = around(10, 0, 170, 82).map((_, i) => { const r = i % 2 ? 14 : 34, a = ((i * 36 - 90) * Math.PI) / 180; return `${f(170 + r * Math.cos(a))} ${f(82 + r * Math.sin(a))}` }); return `M${p.join('L')}Z` })()}"/>` : ''
  const shape = `<g class="c-flicker"><path class="ga-line c-glow" stroke-width="10" d="${d}"/><path class="ga-line" stroke-width="3" d="${d}"/>${inner}</g>`
  const bg = pick({
    grid: '<g class="ga-line2 ga-thin c-faint">' + [38, 91, 144, 197, 250, 303].map(x => `<path d="M170 191L${x} 150"/>`).join('') + '<path d="M0 154H340M0 166H340M0 182H340"/></g>',
    dots: '<g>' + [[30, 70], [60, 140], [100, 20], [250, 20], [290, 140], [318, 80], [20, 170], [320, 175], [140, 172], [204, 176]].map(([x, y], i) => `<circle class="${i % 2 ? 'ga-fill' : 'ga-fill2'}" cx="${x}" cy="${y}" r="${i % 3 ? 3 : 4.5}"/>`).join('') + '</g>',
    rays: `<g class="c-faint"><path class="ga-line2 ga-thin" d="${rays(18, 90, 200, 170, 86)}"/></g>`,
  }, o.background)
  const marks = '<path class="ga-line2" d="M11 126Q32 112 53 126T95 126M245 168Q266 152 287 168T329 168M19 25h38M38 6v38M287 26h34M304 9v34"/>'
  return svg('0 0 340 190', bg + marks + shape)
}

const EMBLEM: Record<string, (o: Options) => string> = {
  'mazal-tov-papercut': papercut,
  'chuppah-jubilee': chuppah,
  'seven-blessings': sevenBlessings,
  'rimon-fiesta': rimon,
  'klezmer-confetti': klezmer,
  'firework-finale': fireworks,
  'poolside-vows': poolside,
  'confetti-couture': couture,
  'gala-glow': gala,
  'neon-afterglow': neon,
}

// ------------------------------------------------------------------------ dividers

const DIVIDER: Record<string, (o: Options) => string> = {
  'mazal-tov-papercut': () => svg('0 0 160 20', `<path class="ga-line ga-thin" d="M4 10H56M104 10H156"/>${[66, 80, 94].map((x, i) => diamond(x, 10, i === 1 ? 7 : 5, i === 1 ? 'ga-fill' : 'ga-fill2')).join('')}`),
  'chuppah-jubilee': () => svg('0 0 160 24', `<path class="ga-line ga-thin" d="M4 12Q42 22 64 12M96 12Q118 22 156 12"/>${flower(80, 12, 11, 8, 'ga-fill2')}`),
  'seven-blessings': () => svg('0 0 160 16', Array.from({ length: 7 }, (_, i) => `<circle class="${i === 3 ? 'ga-fill' : 'ga-fill2'}" cx="${44 + i * 12}" cy="8" r="${i === 3 ? 4.5 : 3}"/>`).join('')),
  'rimon-fiesta': () => svg('0 0 160 24', `<path class="ga-line2 ga-thin" d="M4 12H60M100 12H156"/>${diamond(80, 12, 11, 'ga-fill')}${diamond(80, 12, 5, 'ga-ground')}${diamond(64, 12, 4, 'ga-fill2')}${diamond(96, 12, 4, 'ga-fill2')}`),
  'klezmer-confetti': () => svg('0 0 160 40', `<path class="ga-line2" d="M4 26Q40 6 80 26T156 22"/>${note(74, 30)}`),
  'firework-finale': () => svg('0 0 160 24', `<path class="ga-line ga-thin" d="M4 12H62M98 12H156"/>${star4(80, 12, 11, 'ga-fill')}${star4(70, 5, 3, 'ga-fill2')}${star4(91, 19, 3, 'ga-fill2')}`),
  'poolside-vows': () => svg('0 0 160 20', '<path class="ga-line" stroke-width="2.5" d="M4 10Q24 0 44 10T84 10 124 10 164 10"/>'),
  'confetti-couture': o => svg('0 0 160 20', `<path class="ga-line ga-thin" d="M4 10H64M96 10H156"/>${confettiBit(o.confetti ?? 'diamonds', 72, 10, 0)}${confettiBit(o.confetti ?? 'diamonds', 88, 10, 1)}`),
  'gala-glow': () => svg('0 0 160 40', `<path class="ga-line ga-thin" d="M4 8H66M94 8H156"/>${drop(80, 0, 0.75)}`),
  'neon-afterglow': () => svg('0 0 160 24', `<path class="ga-line" d="M4 12H60M100 12H156"/>${heart(80, 10, 0.9, 'ga-line2')}`),
}

// ------------------------------------------------------------------------ backdrops
// Small pieces scattered at the page's edges, away from the text.

const bit = (x: number, y: number, size: number, body: string) =>
  `<span class="c-bit" style="inset-inline-start:${x}%;top:${y}rem;width:${size}rem">${svg('-12 -12 24 24', body)}</span>`
// Centred in the side gutters (at least 20px wide at 375px), so they never sit on the text.
const EDGE = [[2.6, 22, 0], [97.4, 30, 1], [2.6, 44, 2], [97.4, 54, 3], [2.6, 70, 4], [97.4, 82, 5], [2.6, 98, 6], [97.4, 110, 7]] as const

const BACKDROP: Record<string, (o: Options, scheme: string) => string> = {
  'klezmer-confetti': o => EDGE.map(([x, y, i]) => bit(x, y, 0.95, ({
    ribbons: `<path class="${i % 2 ? 'ga-line' : 'ga-line2'}" stroke-width="2.5" d="M-10 0Q-5-8 0 0T10 0"/>`,
    notes: note(-3, 7, i % 2 ? 'ga-fill2' : 'ga-fill').replace(/stroke-width="2.6"/, 'stroke-width="2"'),
    dots: `<circle class="${i % 2 ? 'ga-fill' : 'ga-fill2'}" r="${i % 3 ? 4 : 6}"/>`,
  } as Record<string, string>)[o.confetti ?? 'ribbons'] ?? '')).join(''),
  'firework-finale': () => EDGE.map(([x, y, i]) => bit(x, y * 0.7, 0.8, star4(0, 0, i % 2 ? 6 : 9, i % 2 ? 'ga-fill2' : 'ga-fill'))).join(''),
  'confetti-couture': o => EDGE.slice(0, 6).map(([x, y, i]) => bit(x, y * 0.6, 0.9, confettiBit(o.confetti ?? 'diamonds', 0, 0, i))).join(''),
  'mazal-tov-papercut': () => EDGE.slice(2).map(([x, y, i]) => bit(x, y, 0.9, diamond(0, 0, 8, i % 2 ? 'ga-line' : 'ga-line2'))).join(''),
  'neon-afterglow': (o) => o.background === 'dots' ? EDGE.map(([x, y, i]) => bit(x, y, 0.6, `<circle class="${i % 2 ? 'ga-fill' : 'ga-fill2'}" r="6"/>`)).join('') : '',
  'rimon-fiesta': o => `<span class="c-corner c-corner-a">${svg('0 0 60 60', cornerTile(o.tiles))}</span><span class="c-corner c-corner-b">${svg('0 0 60 60', cornerTile(o.tiles))}</span>`,
  'seven-blessings': o => o.border === 'jewel' ? ['a', 'b', 'c', 'd'].map(k => `<span class="c-jewel c-jewel-${k}">${svg('-14 -14 28 28', `${diamond(0, 0, 12, 'ga-fill')}${diamond(0, 0, 6, 'ga-fill2')}`)}</span>`).join('') : '',
}
function cornerTile(kind?: string) {
  if (kind === 'flowers') return flower(30, 30, 24, 8, 'ga-fill2')
  if (kind === 'arches') return '<path class="ga-line" stroke-width="3" d="M8 56V30a22 22 0 0 1 44 0V56"/><path class="ga-line2" d="M18 56V32a12 12 0 0 1 24 0V56"/>'
  return `${diamond(30, 30, 26, 'ga-fill3')}${diamond(30, 30, 16, 'ga-ground')}${diamond(30, 30, 8, 'ga-fill2')}`
}

export const CELEBRATION_STYLES = Object.keys(EMBLEM)
export const isCelebration = (look: string) => look in EMBLEM

export const celebrationArt = (look: string, options: Options, scheme = 'light') => ({
  emblem: EMBLEM[look]?.(options) ?? '',
  divider: DIVIDER[look]?.(options) ?? '',
  backdrop: BACKDROP[look]?.(options, scheme) ?? '',
})
