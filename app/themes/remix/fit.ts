import type { Directive } from 'vue'

/**
 * `v-fit`: shrinks a placed text block's type until it fits its box, so long names never
 * overflow the art or run into the date. With `v-fit:lines`, every `.rx-line` child stays on
 * one line (the design's line breaks) and the type shrinks until the widest fits; without it
 * the block itself must not overflow its width. Never below 45% of the designed size.
 */
const observers = new WeakMap<HTMLElement, ResizeObserver>()

function fit(el: HTMLElement, lines: boolean) {
  el.style.fontSize = ''
  el.classList.remove('rx-fit-wrap')
  const base = Number.parseFloat(getComputedStyle(el).fontSize)
  const width = el.clientWidth
  if (!base || !width) return
  const widest = lines
    ? Math.max(0, ...[...el.querySelectorAll<HTMLElement>('.rx-line')].map(l => l.scrollWidth))
    : el.scrollWidth
  if (widest <= width + 1) return
  const scale = Math.max(0.45, (width / widest) * 0.98)
  el.style.fontSize = `${base * scale}px`
  // Still too wide at the smallest size (a very long headline): let it wrap.
  if (scale === 0.45) el.classList.add('rx-fit-wrap')
}

export const vFit: Directive<HTMLElement> = {
  mounted(el, binding) {
    const lines = binding.arg === 'lines'
    const run = () => fit(el, lines)
    run()
    document.fonts?.ready.then(run)
    const observer = new ResizeObserver(run)
    observer.observe(el.parentElement ?? el)
    observers.set(el, observer)
  },
  updated(el, binding) {
    fit(el, binding.arg === 'lines')
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
  getSSRProps: () => ({}),
}
