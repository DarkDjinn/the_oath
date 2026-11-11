/**
 * The catalogue of invitation themes and the options each one offers.
 * Shared by the server (to validate a saved design) and the admin (to draw the picker).
 * The matching components are registered in app/themes/index.ts.
 *
 * To add a theme: add an entry here, add its component there. To make a
 * one-off design for a single couple, set `onlyFor` to their campaign slug(s).
 */
export interface ThemeOption { label: string, choices: Record<string, string> }
export interface ThemeDefinition {
  name: string
  description: string
  options: Record<string, ThemeOption>
  defaults: Record<string, string>
  /** Campaign slugs that may use this theme. Omit for a theme everyone can pick. */
  onlyFor?: string[]
}

export const THEMES: Record<string, ThemeDefinition> = {
  nocturne: {
    name: 'Nocturne',
    description: 'Gothic romance: a line engraving of thorns, roses and moonlight on a dark ground.',
    options: {
      emblem: { label: 'Emblem', choices: { heart: 'Thorn heart', wreath: 'Rose wreath', moon: 'Moon in a braided ring' } },
      palette: { label: 'Colours', choices: { gold: 'Gold on black', bone: 'Bone white on black', oxblood: 'Gold on oxblood' } },
      backdrop: { label: 'Backdrop', choices: { stars: 'Starlit', plain: 'Plain', damask: 'Rose damask', spires: 'Gothic spires' } },
      gate: { label: 'RSVP button', choices: { gate: 'Inside a garden gate', plain: 'On its own' } },
    },
    defaults: { emblem: 'heart', palette: 'gold', backdrop: 'stars', gate: 'gate' },
  },
}

export const DEFAULT_THEME = 'nocturne'

export interface Design {
  theme: string
  options: Record<string, string>
  /** Owner-only escape hatch for one-off adjustments. */
  customCss: string
}

export const themesFor = (slug: string) =>
  Object.fromEntries(Object.entries(THEMES).filter(([, t]) => !t.onlyFor || t.onlyFor.includes(slug)))

/** Keep only known options with known values; fill the rest from the theme's defaults. */
export function normaliseDesign(input: unknown, slug: string, previous?: Design): Design {
  const raw = (input ?? {}) as Partial<Design>
  const available = themesFor(slug)
  const theme = typeof raw.theme === 'string' && available[raw.theme] ? raw.theme : (previous && available[previous.theme] ? previous.theme : DEFAULT_THEME)
  const definition = THEMES[theme]!
  const options: Record<string, string> = {}
  for (const [key, option] of Object.entries(definition.options)) {
    const value = (raw.options ?? {})[key]
    options[key] = typeof value === 'string' && value in option.choices ? value : definition.defaults[key]!
  }
  return { theme, options, customCss: previous?.customCss ?? '' }
}
