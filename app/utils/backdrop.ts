import type { Tokens } from '#shared/design/tokens'
import { rose, stars, vine } from './ornament'

/**
 * Page backdrops, drawn with the same engraving tools as the ornament and
 * delivered as CSS background images (SVG data URIs, so no extra requests).
 * Chosen per campaign in the Design tab.
 */
export type Backdrop = 'plain' | 'stars' | 'damask' | 'spires'

const css = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
const doc = (w: number, h: number, style: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><style>${style}</style>${body}</svg>`

/** A night sky that runs the whole length of the page. */
function starsTile(ink: string): string {
  return doc(640, 960, `.o-star{fill:${ink}}`, stars(170, 3, [0, 0, 640, 960], false))
}

/** Tone-on-tone rose-and-briar wallpaper, like blind embossing on black card. */
function damaskTile(GOLD: string): string {
  const style = `.o-rose,.o-leaf,.o-line{fill:none;stroke:${GOLD};stroke-opacity:.1}.o-rose{stroke-width:1}.o-leaf{stroke-width:.8}.o-ink{fill:${GOLD};fill-opacity:.1}`
  const w = 200, h = 280
  const down = (x: number, y: number, dir: 1 | -1, seed: number) =>
    vine([[x + dir * 8, y + 26], [x + dir * 34, y + 58], [x + dir * 70, y + 76], [x + dir * 92, y + 112]], { seed, width: 1.1, thornEvery: 14, leafEvery: 22, leafLen: 12 })
  let body = rose(100, 44, 30) + down(100, 44, 1, 2) + down(100, 44, -1, 3)
  // Half-drop repeat: the roses on the side edges sit halfway down, and their briars wrap around the tile.
  for (const x of [0, w]) for (const y of [184, 184 - h]) body += rose(x, y, 30, 36) + down(x, y, 1, 5) + down(x, y, -1, 6)
  return doc(w, h, style, body)
}

/** Gothic spires standing in the dark at one side of the page. */
function spires(flip: boolean, GOLD: string, wall: string, ground: string): string {
  const w = 420, h = 760
  const style = `.wall{fill:${wall};stroke:${GOLD};stroke-opacity:.2;stroke-width:1}.win{fill:${ground};stroke:${GOLD};stroke-opacity:.28;stroke-width:.8}.fin{fill:${GOLD};fill-opacity:.3}`
  const towers: [number, number, number][] = [[250, 64, 400], [170, 92, 560], [96, 58, 330], [318, 54, 260], [20, 70, 450], [372, 40, 170]]
  let body = ''
  for (const [x, tw, th] of towers) {
    const top = h - th, cx = x + tw / 2, roof = tw * 2.3
    body += `<path class="wall" d="M${x} ${h}V${top}L${cx} ${top - roof}L${x + tw} ${top}V${h}Z"/>`
    body += `<path class="fin" d="M${cx} ${top - roof - 16}l3 9l-3 5l-3-5Z"/>`
    // small pinnacles at the shoulders
    for (const px of [x, x + tw]) body += `<path class="wall" d="M${px - 5} ${top + 8}V${top - 14}L${px} ${top - 34}L${px + 5} ${top - 14}V${top + 8}Z"/>`
    // lancet windows
    const cols = tw > 80 ? 2 : 1
    for (let row = 0; row * 120 + 40 < th - 60; row++) {
      for (let c = 0; c < cols; c++) {
        const wx = x + tw * (c + 1) / (cols + 1), wy = top + 34 + row * 120, ww = Math.min(9, tw / 7)
        body += `<path class="win" d="M${wx - ww} ${wy + 58}V${wy + 16}Q${wx - ww} ${wy + 2} ${wx} ${wy - 8}Q${wx + ww} ${wy + 2} ${wx + ww} ${wy + 16}V${wy + 58}Z"/>`
      }
    }
    body += `<path class="win" d="M${x} ${top + 14}H${x + tw}" />`
  }
  const inner = flip ? `<g transform="translate(${w} 0) scale(-1 1)">${body}</g>` : body
  return doc(w, h, style, inner)
}

/** The colours the backdrop art is drawn in. SVG data-URI images cannot read CSS variables, so they are passed in. */
export type BackdropInk = Pick<Tokens, 'accent' | 'star' | 'ground' | 'wall' | 'glow' | 'haze'>

/** Inline style for the invitation's root element. */
export function backdropStyle(kind: Backdrop, ink: BackdropInk): Record<string, string> {
  const glow = `radial-gradient(ellipse 34rem 26rem at 50% 15rem, ${ink.glow} 0%, transparent 70%)`
  switch (kind) {
    case 'stars':
      return { backgroundImage: `${glow}, ${css(starsTile(ink.star))}`, backgroundRepeat: 'no-repeat, repeat', backgroundSize: 'auto, 640px 960px', backgroundPosition: '0 0, 50% 0' }
    case 'damask':
      return { backgroundImage: `${glow}, ${css(damaskTile(ink.accent))}`, backgroundRepeat: 'no-repeat, repeat', backgroundSize: 'auto, 200px 280px', backgroundPosition: '0 0, 50% 0' }
    case 'spires':
      return {
        backgroundImage: `${glow}, linear-gradient(to bottom, transparent 0, transparent 34rem, ${ink.ground} 56rem), ${css(spires(false, ink.accent, ink.wall, ink.ground))}, ${css(spires(true, ink.accent, ink.wall, ink.ground))}, radial-gradient(ellipse 60rem 30rem at 50% 44rem, ${ink.haze} 0%, transparent 70%)`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'auto, auto, 420px 760px, 420px 760px, auto',
        backgroundPosition: '0 0, 0 0, right calc(50% + 21rem) top 6rem, left calc(50% + 21rem) top 6rem, 0 0',
      }
    default:
      return { backgroundImage: glow, backgroundRepeat: 'no-repeat' }
  }
}
