/**
 * Keeps every line of text on a remix page readable, whatever colours the couple chose.
 *
 * The designs set text in colours drawn from their art; with other presets (or colours picked
 * by hand) a colour can end up too close to the panel behind it. After the page renders, each
 * text element's colour is measured against its actual background and, if it falls short of
 * WCAG AA (4.5:1, or 3:1 for large text), moved toward black or white just far enough to pass,
 * keeping its hue. Decoration (aria-hidden) and text over pictures are left alone.
 */
type Rgba = [number, number, number, number]

const parse = (c: string): Rgba | null => {
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) return null
  const p = m[1]!.split(/[\s,/]+/).filter(Boolean).map(Number)
  return [p[0]!, p[1]!, p[2]!, p.length > 3 ? p[3]! : 1]
}
const channel = (v: number) => {
  v /= 255
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}
const lum = ([r, g, b]: number[]) => 0.2126 * channel(r!) + 0.7152 * channel(g!) + 0.0722 * channel(b!)
const ratio = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p) as [number, number]
  return (x + 0.05) / (y + 0.05)
}

/** The solid colour behind an element, or null when it sits on a picture or gradient. */
function backgroundOf(el: Element | null): Rgba | null {
  for (let e = el; e; e = e.parentElement) {
    const cs = getComputedStyle(e)
    if (cs.backgroundImage !== 'none') return null
    const c = parse(cs.backgroundColor)
    if (c && c[3] > 0.9) return c
  }
  return null
}
function opacityOf(el: Element | null, stop: Element) {
  let o = 1
  for (let e = el; e && e !== stop; e = e.parentElement) o *= Number(getComputedStyle(e).opacity)
  return o
}

export function ensureReadable(root: HTMLElement) {
  // A rendered line keeps its fix across re-checks unless the colours themselves change.
  root.querySelectorAll<HTMLElement>('[data-rx-fixed]').forEach((el) => {
    el.style.removeProperty('color')
    el.style.removeProperty('opacity')
    el.removeAttribute('data-rx-fixed')
  })
  for (const el of root.querySelectorAll<HTMLElement>('main *, .rx-topbar *')) {
    if (el.closest('[aria-hidden="true"], .sr-only, .rx-hero')) continue
    const ownText = [...el.childNodes].some(n => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1)
    if (!ownText) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const fg = parse(cs.color)
    const bg = backgroundOf(el)
    if (!fg || !bg) continue
    const size = Number.parseFloat(cs.fontSize)
    const need = (size >= 24 || (size >= 18.66 && Number(cs.fontWeight) >= 700)) ? 3.1 : 4.6
    const alpha = fg[3] * opacityOf(el, root)
    const seen = [0, 1, 2].map(i => fg[i]! * alpha + bg[i]! * (1 - alpha))
    if (ratio(seen, bg) >= need) continue
    // Toward whichever of black and white contrasts more with the background.
    const target = ratio([0, 0, 0], bg) > ratio([255, 255, 255], bg) ? 0 : 255
    let fixed = fg.slice(0, 3)
    for (let t = 0.1; t <= 1.001; t += 0.1) {
      fixed = fg.slice(0, 3).map(v => v + (target - v) * t)
      if (ratio(fixed, bg) >= need) break
    }
    el.style.setProperty('color', `rgb(${fixed.map(Math.round).join(' ')})`, 'important')
    // Faded on purpose (a footer at 70%): lift the fade on the element and the boxes around it.
    if (alpha < 1) {
      for (let e: HTMLElement | null = el; e && e !== root; e = e.parentElement) {
        if (Number(getComputedStyle(e).opacity) < 1) {
          e.style.setProperty('opacity', '1', 'important')
          e.setAttribute('data-rx-fixed', '')
        }
      }
    }
    el.setAttribute('data-rx-fixed', '')
  }
}
