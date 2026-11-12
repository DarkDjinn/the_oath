import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fontsForRole, FONT_ROLES, type FontRole } from '../../shared/design/fonts'
import { normaliseDesign, PRESETS, THEMES } from '../../shared/themes'
import { CELEBRATION_STYLES, celebrationArt } from '../../app/themes/celebration/art'

const IDS = ['mazal-tov-papercut', 'chuppah-jubilee', 'seven-blessings', 'rimon-fiesta', 'klezmer-confetti', 'firework-finale', 'poolside-vows', 'confetti-couture', 'gala-glow', 'neon-afterglow']
const css = readFileSync(new URL('../../app/themes/celebration/celebration.css', import.meta.url), 'utf8')
const balanced = (markup: string) => (markup.match(/<svg/g) ?? []).length === (markup.match(/<\/svg>/g) ?? []).length

describe('celebration collection', () => {
  it('registers exactly the ten styles, each with art', () => {
    expect([...CELEBRATION_STYLES].sort()).toEqual([...IDS].sort())
    for (const id of IDS) expect(THEMES[id], id).toBeDefined()
  })

  it('has three presets per style, the default among them, and fonts valid for their roles', () => {
    for (const id of IDS) {
      const presets = Object.entries(PRESETS).filter(([, p]) => p.theme === id).map(([k]) => k)
      expect(presets, id).toHaveLength(3)
      expect(presets, id).toContain(THEMES[id]!.preset)
      const lettering = THEMES[id]!.lettering!
      for (const role of Object.keys(FONT_ROLES) as FontRole[]) expect(Object.keys(fontsForRole(role)), `${id} ${role}`).toContain(lettering[role])
    }
  })

  it('draws a complete opening for every choice of every option, with and without photos', () => {
    for (const id of IDS) {
      const { options, defaults } = THEMES[id]!
      for (const [key, option] of Object.entries(options)) {
        for (const choice of Object.keys(option.choices)) {
          const art = celebrationArt(id, { ...defaults, [key]: choice })
          expect(art.emblem, `${id} ${key}=${choice}`).toContain('<svg')
          for (const part of Object.values(art)) {
            expect(part.includes('undefined') || part.includes('NaN'), `${id} ${key}=${choice}`).toBe(false)
            expect(balanced(part), `${id} ${key}=${choice}`).toBe(true)
          }
        }
      }
      expect(defaults['photo-layout'], id).toBe('none')
    }
  })

  it('choices change the drawing', () => {
    for (const id of IDS) {
      const { options, defaults } = THEMES[id]!
      for (const [key, option] of Object.entries(options)) {
        if (option.topic !== 'ornaments') continue
        const drawings = Object.keys(option.choices).map((c) => { const a = celebrationArt(id, { ...defaults, [key]: c }); return a.emblem + a.backdrop + a.divider })
        if (new Set(drawings).size === drawings.length) continue
        // Otherwise the option is a frame drawn in CSS: every choice but the plain one has a rule.
        for (const c of Object.keys(option.choices).filter(c => !['none', 'clean'].includes(c))) expect(css, `${id} ${key}=${c}`).toContain(`.gal-${id}.g-${key}-${c}`)
      }
    }
  })

  it('Seven Blessings always has seven medallions', () => {
    for (const m of ['rosettes', 'facets', 'stars']) {
      const { emblem } = celebrationArt('seven-blessings', { ...THEMES['seven-blessings']!.defaults, medallions: m })
      const count = { rosettes: /<text/g, facets: /class="ga-soft2?" d="M/g, stars: /stroke-linejoin="round"/g }[m]!
      expect((emblem.match(count) ?? []).length, m).toBe(7)
    }
  })

  it('a new design in each style starts from its own preset, typefaces and defaults', () => {
    for (const id of IDS) {
      const design = normaliseDesign({ theme: id }, 'any')
      expect(design.preset).toBe(THEMES[id]!.preset)
      expect(design.lettering).toEqual(THEMES[id]!.lettering)
      expect(design.options).toEqual(THEMES[id]!.defaults)
    }
  })
})
