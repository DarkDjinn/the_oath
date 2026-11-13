/**
 * Recolouring the remix art with the couple's colours.
 *
 * Every colour in a style's art is stored as its OKLCH value in the style's default preset,
 * tied to the colour role it was drawn from (art.ts, generated). On the default preset the
 * art comes out exactly as drawn; with other colours each art colour moves with its role:
 * quiet colours follow their neutral (so a dark preset darkens the paper and lightens the
 * ink), saturated ones follow their accent's hue and strength.
 */
import { contrast } from '#shared/design/colour'

export type Role = 'ground' | 'surface' | 'text' | 'muted' | 'accent' | 'accent2'
/** [role, L, C, H] of an art colour in the style's default preset. */
export type ArtColour = [string, number, number, number]
type Colours = Record<Role, string>

// ----------------------------------------------------------------------------- OKLCH maths
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toGamma = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)

export function toOklch(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h
  const [r, g, b] = [0, 2, 4].map(i => toLinear(Number.parseInt(full.slice(i, i + 2), 16) / 255)) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
  return [L, Math.hypot(A, B), ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360]
}

function fromOklab(L: number, A: number, B: number): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3
  const s = (L - 0.0894841775 * A - 1.2914855480 * B) ** 3
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ]
}

/** OKLCH → hex, reducing chroma until the colour fits in sRGB. */
export function fromOklch(L: number, C: number, H: number): string {
  L = Math.min(1, Math.max(0, L))
  const rad = (H * Math.PI) / 180
  let c = Math.max(0, C)
  let rgb = fromOklab(L, c * Math.cos(rad), c * Math.sin(rad))
  for (let i = 0; i < 24 && rgb.some(v => v < -0.0005 || v > 1.0005); i++) {
    c *= 0.9
    rgb = fromOklab(L, c * Math.cos(rad), c * Math.sin(rad))
  }
  return `#${rgb.map(v => Math.round(Math.min(1, Math.max(0, toGamma(Math.min(1, Math.max(0, v))))) * 255).toString(16).padStart(2, '0')).join('')}`
}

const hueShift = (a: number, b: number) => ((b - a + 540) % 360) - 180

/** An art colour, moved from the style's default colours to the couple's. */
export function recolour([role, L, C, H]: ArtColour, from: Colours, to: Colours): string {
  const r = role as Role
  const [L0, C0, H0] = toOklch(from[r])
  const [L1, C1, H1] = toOklch(to[r])
  if (from[r].toLowerCase() === to[r].toLowerCase()) return fromOklch(L, C, H)
  const neutral = r === 'ground' || r === 'surface' || r === 'text' || r === 'muted'
  if (neutral) {
    // Follow the neutral: lightness moves with it, a tint takes its hue when it has one.
    const hue = C1 > 0.02 ? H + hueShift(H0, H1) : H
    return fromOklch(L + (L1 - L0), Math.max(0, C + (C1 - C0)), hue)
  }
  // Follow the accent: its hue, its strength, half of its change in lightness.
  const strength = C0 > 0.02 ? C1 / C0 : 1
  return fromOklch(L + 0.6 * (L1 - L0), Math.min(0.37, C * strength), H + hueShift(H0, H1))
}

/** The CSS variables for a style's art: --x0…, and --p0… for text kept readable on its panel. */
export function artVars(palette: ArtColour[], pairs: [string | number, string | number][], from: Colours, to: Colours) {
  const colours = palette.map(c => recolour(c, from, to))
  const vars: Record<string, string> = {}
  colours.forEach((c, i) => { vars[`--x${i}`] = c })
  const value = (k: string | number) => typeof k === 'number' ? colours[k]! : to[k as Role]
  pairs.forEach(([bg, fg], i) => {
    const back = value(bg)
    const wanted = value(fg)
    if (contrast(wanted, back) >= 4.5) {
      vars[`--p${i}`] = wanted
      return
    }
    // Otherwise the most readable of the page's own ink, its paper, white and black (one of the last two always passes).
    vars[`--p${i}`] = [wanted, to.text, to.ground, '#ffffff', '#000000'].reduce((best, c) => (contrast(c, back) > contrast(best, back) ? c : best))
  })
  return vars
}
