/**
 * Small colour maths for the design studio: validate a hex, blend two colours,
 * and measure whether one is readable on another (WCAG 2 contrast).
 * Shared by the server (which refuses unreadable designs) and the admin (which explains why).
 */
export type Rgb = [number, number, number]

/** `#rgb` or `#rrggbb`, nothing else: these values end up inside style attributes and SVG. */
export const isHex = (value: unknown): value is string => typeof value === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)

/** Lower-case six-digit form, so equal colours compare equal. */
export function normaliseHex(value: string): string {
  const h = value.slice(1).toLowerCase()
  return `#${h.length === 3 ? [...h].map(c => c + c).join('') : h}`
}

export function toRgb(hex: string): Rgb {
  const h = normaliseHex(hex).slice(1)
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)) as Rgb
}

export const toHex = (rgb: Rgb): string => `#${rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`

/** `amount` of `b` mixed into `a` (0 = all a, 1 = all b). */
export function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a), y = toRgb(b)
  return toHex(x.map((v, i) => v + (y[i]! - v) * amount) as Rgb)
}

export function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG contrast ratio, 1 (none) to 21 (black on white). */
export function contrast(a: string, b: string): number {
  const x = luminance(a), y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

export const isLight = (hex: string): boolean => luminance(hex) > 0.4

/**
 * The nearest colour to `colour` that reaches `ratio` against `ground`:
 * the same hue pushed towards white on a dark ground, or towards black on a light one.
 */
export function readable(colour: string, ground: string, ratio: number): string {
  if (contrast(colour, ground) >= ratio) return normaliseHex(colour)
  // Mid-tone grounds (a pure red, say) are only readable in one direction, and not always the obvious one.
  const targets = isLight(ground) ? ['#000000', '#ffffff'] : ['#ffffff', '#000000']
  for (const target of targets) {
    for (let step = 1; step <= 40; step++) {
      const next = mix(colour, target, step / 40)
      if (contrast(next, ground) >= ratio) return next
    }
  }
  return contrast('#000000', ground) > contrast('#ffffff', ground) ? '#000000' : '#ffffff'
}
