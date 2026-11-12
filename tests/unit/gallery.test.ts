import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fontsForRole, FONT_ROLES, type FontRole } from '../../shared/design/fonts'
import { normaliseDesign, PRESETS, THEMES } from '../../shared/themes'
import { backdrop, divider, emblem } from '../../app/themes/gallery/art'

const GALLERY = ['still', 'jaffa-sun', 'velvet-deco', 'herbarium', 'saffron-dunes', 'ma', 'postmarked-love', 'happy-accident', 'jerusalem-stone', 'golden-hour-groove']

describe('gallery styles', () => {
  it('every style is in the picker and has a page', () => {
    const map = readFileSync(new URL('../../app/themes/index.ts', import.meta.url), 'utf8')
    for (const id of Object.keys(THEMES)) expect(map, id).toMatch(new RegExp(`['"]?${id}['"]?:`))
    for (const id of GALLERY) expect(THEMES[id], id).toBeDefined()
  })

  it('each style has three presets and its own typefaces, valid for their roles', () => {
    for (const id of GALLERY) {
      expect(Object.values(PRESETS).filter(p => p.theme === id), id).toHaveLength(3)
      const lettering = THEMES[id]!.lettering!
      for (const role of Object.keys(FONT_ROLES) as FontRole[]) expect(Object.keys(fontsForRole(role)), `${id} ${role}`).toContain(lettering[role])
    }
  })

  it('draws for every choice of every option', () => {
    for (const id of GALLERY) {
      const { options, defaults } = THEMES[id]!
      for (const [key, option] of Object.entries(options)) {
        for (const choice of Object.keys(option.choices)) {
          const chosen = { ...defaults, [key]: choice }
          for (const art of [emblem(id, chosen), divider(id, chosen), backdrop(id, chosen)]) {
            expect(art.includes('undefined'), `${id} ${key}=${choice}`).toBe(false)
            expect((art.match(/<svg/g) ?? []).length, `${id} ${key}=${choice}`).toBe((art.match(/<\/svg>/g) ?? []).length)
          }
        }
      }
      expect(emblem(id, defaults), id).toContain('<svg')
    }
  })

  it('a new design in a gallery style starts from its preset, typefaces and defaults', () => {
    for (const id of GALLERY) {
      const design = normaliseDesign({ theme: id, options: { nonsense: 'x' } }, 'any')
      expect(design.preset).toBe(THEMES[id]!.preset)
      expect(design.colours).toEqual(PRESETS[THEMES[id]!.preset]!.colours)
      expect(design.lettering).toEqual(THEMES[id]!.lettering)
      expect(design.options).toEqual(THEMES[id]!.defaults)
    }
  })

  it('an unknown choice falls back to the default, a known one is kept', () => {
    const design = normaliseDesign({ theme: 'ma', options: { mark: 'branch', layout: 'sideways' } }, 'any')
    expect(design.options).toEqual({ ...THEMES.ma!.defaults, mark: 'branch' })
  })
})
