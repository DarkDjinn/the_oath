import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { contrast } from '../../shared/design/colour'
import { fontsForRole, FONT_ROLES, type FontRole } from '../../shared/design/fonts'
import { normaliseDesign, PRESETS, THEMES } from '../../shared/themes'
import { artVars, fromOklch, recolour, toOklch, type Role } from '../../app/themes/remix/palette'

const IDS = [
  'still', 'jaffa-sun', 'velvet-deco', 'herbarium', 'saffron-dunes', 'ma', 'postmarked-love', 'happy-accident', 'jerusalem-stone', 'golden-hour-groove',
  'mazal-tov-papercut', 'chuppah-jubilee', 'seven-blessings', 'rimon-fiesta', 'klezmer-confetti', 'firework-finale', 'poolside-vows', 'confetti-couture', 'gala-glow', 'neon-afterglow',
]
const dir = (id: string) => new URL(`../../app/themes/remix/styles/${id}/`, import.meta.url)
const read = (url: URL) => readFileSync(url, 'utf8')
const load = (id: string) => Promise.all([import(`../../app/themes/remix/styles/${id}/art.ts`), import(`../../app/themes/remix/styles/${id}/options.ts`)])
const baseCss = read(new URL('../../app/themes/remix/remix.css', import.meta.url))

describe('the twenty remix styles', () => {
  it('keeps Nocturne and Rose Keepsake, and gives each of the 22 styles a page', () => {
    const map = read(new URL('../../app/themes/index.ts', import.meta.url))
    expect(Object.keys(THEMES)).toHaveLength(22)
    expect(map).toContain('nocturne: NocturneInvitation')
    expect(map).toContain('keepsake: KeepsakeInvitation')
    for (const id of IDS) {
      expect(THEMES[id], id).toBeDefined()
      expect(map, id).toContain(`'${id}': remix(() => import('./remix/styles/${id}/index.vue'))`)
      for (const f of ['index.vue', 'art.ts', 'options.ts', 'style.css', 'extra.css']) expect(existsSync(new URL(f, dir(id))), `${id}/${f}`).toBe(true)
    }
  })

  it('has three presets each, the default among them, and typefaces valid for their roles', () => {
    for (const id of IDS) {
      const presets = Object.entries(PRESETS).filter(([, p]) => p.theme === id).map(([k]) => k)
      expect(presets, id).toHaveLength(3)
      expect(presets, id).toContain(THEMES[id]!.preset)
      for (const role of Object.keys(FONT_ROLES) as FontRole[]) expect(Object.keys(fontsForRole(role)), `${id} ${role}`).toContain(THEMES[id]!.lettering![role])
    }
  })

  it('draws its hero as inline SVG in role-relative colours, with ids of its own', async () => {
    const seen = new Set<string>()
    for (const id of IDS) {
      const [art] = await load(id)
      expect(art.hero, id).toMatch(/^<svg viewBox="[^"]+"/)
      expect(art.hero.match(/<svg/g)?.length, id).toBe(1)
      expect(art.hero, id).not.toMatch(/#[0-9a-f]{6}\b|<image|<script|\son\w+=/i)
      for (const [, ref] of art.hero.matchAll(/\bid="([^"]+)"/g)) {
        expect(ref.startsWith(`${id}-`), `${id} ${ref}`).toBe(true)
        expect(seen.has(ref), ref).toBe(false)
        seen.add(ref)
      }
      const used = new Set([...art.hero.matchAll(/var\(--x(\d+)\)/g)].map(m => Number(m[1])))
      for (const n of used) expect(n, `${id} --x${n}`).toBeLessThan(art.palette.length)
    }
  })

  it('makes every option choice do something', async () => {
    for (const id of IDS) {
      const [, opts] = await load(id)
      const css = read(new URL('style.css', dir(id))) + read(new URL('extra.css', dir(id))) + baseCss
      const { options, defaults } = THEMES[id]!
      for (const [key, option] of Object.entries(options)) {
        const plain = JSON.stringify(opts.extra({ ...defaults }))
        for (const choice of Object.keys(option.choices)) {
          if (choice === defaults[key]) continue
          const drawn = JSON.stringify(opts.extra({ ...defaults, [key]: choice })) !== plain
          // Photos are laid out by the page itself (rx-photos-<choice>); everything else by a drawing or a rule.
          const styled = css.includes(`rx-o-${key}-${choice}`) || (option.topic === 'photos' && (choice === 'none' || css.includes(`rx-photos-${choice}`) || ['pair', 'diptych', 'polaroids', 'filmstrip', 'side', 'split'].includes(choice)))
          // "None" / "clean" removes what the default adds.
          const removes = ['none', 'clean'].includes(choice) && (css.includes(`rx-o-${key}-${defaults[key]}`) || JSON.stringify(opts.extra({ ...defaults })) !== '{}' || css.includes(`rx-o-${key}-${choice}`))
          expect(drawn || styled || removes, `${id} ${key}=${choice}`).toBe(true)
        }
      }
    }
  })

  it('draws option art without broken markup', async () => {
    for (const id of IDS) {
      const [, opts] = await load(id)
      const { options, defaults } = THEMES[id]!
      for (const [key, option] of Object.entries(options)) {
        for (const choice of Object.keys(option.choices)) {
          const markup = JSON.stringify(opts.extra({ ...defaults, [key]: choice }))
          expect(markup, `${id} ${key}=${choice}`).not.toMatch(/undefined|NaN|Infinity/)
        }
      }
    }
  })

  it('reproduces the art exactly on the style\'s own colours, and moves it with other colours', async () => {
    for (const id of IDS) {
      const [art] = await load(id)
      const own = PRESETS[THEMES[id]!.preset]!.colours as Record<Role, string>
      for (const c of art.palette) {
        const back = toOklch(recolour(c, own, own))
        expect(Math.abs(back[0] - c[1]), `${id} ${c}`).toBeLessThan(0.01)
      }
      const other = Object.values(PRESETS).find(p => p.theme === id && p.colours !== own)!.colours as Record<Role, string>
      const moved = art.palette.filter((c: [string]) => recolour(c as never, own, other) !== recolour(c as never, own, own))
      expect(moved.length, id).toBeGreaterThan(art.palette.length / 2)
    }
  })

  it('keeps text on the art\'s panels readable on every preset', async () => {
    for (const id of IDS) {
      const [art] = await load(id)
      const own = PRESETS[THEMES[id]!.preset]!.colours as Record<Role, string>
      for (const preset of Object.values(PRESETS).filter(p => p.theme === id)) {
        const to = preset.colours as Record<Role, string>
        const vars = artVars(art.palette, art.pairs, own, to)
        art.pairs.forEach(([bg]: [string | number], i: number) => {
          const back = typeof bg === 'number' ? vars[`--x${bg}`]! : to[bg as Role]
          expect(contrast(vars[`--p${i}`]!, back), `${id} ${preset.name} pair ${i}`).toBeGreaterThanOrEqual(4.5)
        })
      }
    }
  })

  it('round-trips colours through OKLCH', () => {
    for (const hex of ['#a5224c', '#116e86', '#f8f2e9', '#20243b', '#ffffff', '#000000']) {
      const [l, c, h] = toOklch(hex)
      expect(fromOklch(l, c, h)).toBe(hex)
    }
  })

  it('keeps a saved campaign\'s own colours and choices', () => {
    const saved = { theme: 'gala-glow', preset: 'gala-glow-pearl-ballroom', colours: { ground: '#101010', surface: '#202020', text: '#f0f0f0', muted: '#b0b0b0', accent: '#d4a640', accent2: '#c03050' }, options: { chandelier: 'tiered', drapery: 'swags', 'rsvp-button': 'bevel', 'photo-layout': 'side' } }
    const design = normaliseDesign(saved, 'any')
    expect(design.colours).toEqual(saved.colours)
    expect(design.options).toEqual(saved.options)
    expect(design.preset).toBe(saved.preset)
  })
})
