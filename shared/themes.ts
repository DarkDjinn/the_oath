import { contrast, isHex, mix, normaliseHex, readable } from './design/colour'
import { normaliseLettering, type Lettering } from './design/fonts'

/**
 * The catalogue of invitation styles and everything a couple may change about one.
 * Shared by the server (to validate a saved design) and the admin (to draw the studio).
 *
 * A design is: a theme (the layout and ornament language), a preset (a named
 * starting point), and the couple's own changes on top of it.
 *
 * To add a theme: add an entry to THEMES, at least one preset, and its component in
 * app/themes/index.ts. To make a one-off design for a single couple, set `onlyFor`
 * on the theme to their campaign slug(s).
 */
/** `topic` is where the studio shows the choice. */
export interface ThemeOption { label: string, topic: 'ornaments' | 'button' | 'photos', choices: Record<string, string> }
export interface ThemeDefinition {
  name: string
  description: string
  options: Record<string, ThemeOption>
  defaults: Record<string, string>
  /** The preset a new campaign starts from. */
  preset: string
  /** The typefaces the style is drawn with, when they differ from the platform's own. */
  lettering?: Lettering
  /** Colour pairings this style needs readable, beyond the ones every style needs. */
  contrast?: ContrastRule[]
  /** What each photo is for in this style, shown beside the upload. */
  photos: { hero: string, second: string }
  /** Campaign slugs that may use this theme. Omit for a theme everyone can pick. */
  onlyFor?: string[]
}

export const THEMES: Record<string, ThemeDefinition> = {
  nocturne: {
    name: 'Nocturne',
    description: 'Gothic romance: a line engraving of thorns, roses and moonlight.',
    options: {
      emblem: { label: 'Emblem', topic: 'ornaments', choices: { heart: 'Thorn heart', wreath: 'Rose wreath', moon: 'Moon in a braided ring' } },
      backdrop: { label: 'Backdrop', topic: 'ornaments', choices: { stars: 'Starlit', plain: 'Plain', damask: 'Rose damask', spires: 'Gothic spires' } },
      gate: { label: 'RSVP button', topic: 'button', choices: { gate: 'Inside a garden gate', plain: 'On its own' } },
    },
    defaults: { emblem: 'heart', backdrop: 'stars', gate: 'gate' },
    preset: 'nocturne-gold',
    photos: { hero: 'Shown in an arched frame under the opening screen. Portrait works best.', second: 'Shown between the details and the RSVP. Landscape works best.' },
  },
  keepsake: {
    name: 'Rose Keepsake',
    description: 'Warm and romantic: a portrait of the two of you, gold script names, a ribbon and soft blush buttons.',
    options: {
      portrait: { label: 'How the main photo is shown', topic: 'photos', choices: { artwork: 'As it is, melted into the background (for a drawing or illustration)', gold: 'Toned in the accent colour', rose: 'Toned in the second accent', natural: 'In its true colours' } },
      frame: { label: 'Frame', topic: 'photos', choices: { none: 'None', arch: 'Arch', circle: 'Medallion', frame: 'Double frame' } },
      sprigs: { label: 'Leaf sprigs', topic: 'ornaments', choices: { on: 'Shown', off: 'Hidden' } },
      button: { label: 'RSVP button', topic: 'button', choices: { pill: 'Filled pill', outline: 'Outlined pill' } },
    },
    defaults: { portrait: 'gold', frame: 'arch', sprigs: 'on', button: 'pill' },
    preset: 'keepsake-plum',
    lettering: { display: 'bona-nova', latin: 'playball', body: 'bona-nova', numeral: 'bona-nova' },
    contrast: [{ role: 'ground', on: 'accent2', ratio: 4.5, what: 'Button and ribbon text on the second accent', adjust: 'accent2' }],
    photos: { hero: 'The portrait at the top of the invitation. A photo or a drawing; landscape or square works best.', second: 'Shown between the welcome and the schedule.' },
  },
}

export const DEFAULT_THEME = 'nocturne'

// ------------------------------------------------------------------ colours

/** The six colours a couple picks. Every other colour on the page is worked out from these. */
export const COLOUR_ROLES = {
  ground: 'Background',
  surface: 'Panels and form fields',
  text: 'Text',
  muted: 'Quiet text',
  accent: 'Accent: lines, headings, button',
  accent2: 'Second accent: roses, seal',
} as const
export type ColourRole = keyof typeof COLOUR_ROLES
export type Colours = Record<ColourRole, string>
const ROLES = Object.keys(COLOUR_ROLES) as ColourRole[]

/**
 * A ready-made starting point. `exact` pins the worked-out colours to hand-tuned
 * values for as long as the couple leaves the preset's six colours untouched.
 */
export interface Preset {
  name: string
  theme: string
  colours: Colours
  exact?: Record<string, string>
}

export const PRESETS: Record<string, Preset> = {
  'nocturne-gold': {
    name: 'Gold on black',
    theme: 'nocturne',
    colours: { ground: '#0a080b', surface: '#141015', text: '#efe6d6', muted: '#b7ad9c', accent: '#c9a961', accent2: '#6b1626' },
    exact: { plate2: '#1d171d', accentDim: '#8f7a48', accent2Bright: '#8f2238', moon: '#e8dcc0', star: '#e3cf9a', wall: '#141016', glow: '#261915', haze: '#1b1622' },
  },
  'nocturne-bone': {
    name: 'Bone white on black',
    theme: 'nocturne',
    colours: { ground: '#050505', surface: '#111112', text: '#f1ece2', muted: '#b9b3a8', accent: '#f1ece2', accent2: '#7a1a2b' },
    exact: { plate2: '#1b1b1d', accentDim: '#8a857c', accent2Bright: '#96233a', moon: '#f1ece2', star: '#f1ece2', wall: '#101010', glow: '#1b1a1c', haze: '#17171a' },
  },
  'nocturne-oxblood': {
    name: 'Gold on oxblood',
    theme: 'nocturne',
    colours: { ground: '#16080c', surface: '#200d13', text: '#efe6d6', muted: '#c4b3a2', accent: '#c9a961', accent2: '#8a1f33' },
    exact: { plate2: '#2b1219', accentDim: '#8f7a48', accent2Bright: '#a52a42', moon: '#e8dcc0', star: '#e3cf9a', wall: '#200d13', glow: '#3a141c', haze: '#2a1017' },
  },
  'nocturne-midnight': {
    name: 'Brass on midnight blue',
    theme: 'nocturne',
    colours: { ground: '#0a1022', surface: '#121a31', text: '#f0ead9', muted: '#b3b6c4', accent: '#d9b56a', accent2: '#345f8c' },
  },
  'nocturne-forest': {
    name: 'Candlelight in the forest',
    theme: 'nocturne',
    colours: { ground: '#0b1510', surface: '#13201a', text: '#ece6d3', muted: '#aeb5a4', accent: '#c8b273', accent2: '#7a2a2a' },
  },
  'nocturne-plum': {
    name: 'Rose gold on plum',
    theme: 'nocturne',
    colours: { ground: '#170d19', surface: '#221425', text: '#f3e7e4', muted: '#c2aeb9', accent: '#dba58f', accent2: '#8c2f5a' },
  },
  'keepsake-plum': {
    name: 'Gold and blush on plum',
    theme: 'keepsake',
    colours: { ground: '#2e0c22', surface: '#3d1430', text: '#f6e6d6', muted: '#d8c0bb', accent: '#e0a868', accent2: '#eaa39c' },
  },
  'keepsake-midnight': {
    name: 'Champagne on midnight',
    theme: 'keepsake',
    colours: { ground: '#0e1730', surface: '#182342', text: '#f4ead8', muted: '#bfc3d2', accent: '#e3c078', accent2: '#a9c4e0' },
  },
  'keepsake-forest': {
    name: 'Gold and sage on forest',
    theme: 'keepsake',
    colours: { ground: '#10231c', surface: '#1a3329', text: '#f1ead9', muted: '#bcc8b8', accent: '#d9b46a', accent2: '#b9d0a8' },
  },
  'keepsake-noir': {
    name: 'Rose gold on black',
    theme: 'keepsake',
    colours: { ground: '#111012', surface: '#1e1c20', text: '#f5ebe6', muted: '#c4b8b6', accent: '#e2a98f', accent2: '#f0c3b8' },
  },
  'keepsake-daylight': {
    name: 'Wine on blush paper',
    theme: 'keepsake',
    colours: { ground: '#f8ebe4', surface: '#f1dcd3', text: '#4a1532', muted: '#74495a', accent: '#9a5a24', accent2: '#7c1f4a' },
  },
  'keepsake-ivory': {
    name: 'Olive on ivory',
    theme: 'keepsake',
    colours: { ground: '#f6f1e4', surface: '#ebe4d1', text: '#2f3527', muted: '#5f6653', accent: '#7a6a2a', accent2: '#4c5d3a' },
  },
  'nocturne-ivory': {
    name: 'Ink on ivory',
    theme: 'nocturne',
    colours: { ground: '#f5efe2', surface: '#ebe3d2', text: '#2a2320', muted: '#655c52', accent: '#7d5f1f', accent2: '#8a1f33' },
  },
}

export const presetsFor = (theme: string) => Object.fromEntries(Object.entries(PRESETS).filter(([, p]) => p.theme === theme))

/** How readable each pairing must be (WCAG 2 contrast). Body text needs more than large headings and line art. */
export interface ContrastRule { role: ColourRole, on: ColourRole, ratio: number, what: string, /** The colour to move when repairing; the `role` itself unless said otherwise. */ adjust?: ColourRole }
export const CONTRAST_RULES: ContrastRule[] = [
  { role: 'text', on: 'ground', ratio: 4.5, what: 'Text on the background' },
  { role: 'muted', on: 'ground', ratio: 4.5, what: 'Quiet text on the background' },
  { role: 'text', on: 'surface', ratio: 4.5, what: 'Text inside form fields' },
  { role: 'accent', on: 'ground', ratio: 3, what: 'Headings and lines on the background' },
]

export interface ColourProblem { role: ColourRole, on: ColourRole, what: string, ratio: number, needed: number }

const rulesFor = (theme?: string): ContrastRule[] => [...CONTRAST_RULES, ...(THEMES[theme ?? '']?.contrast ?? [])]

/** Pairings a guest would struggle to read in this style. Empty when the palette is fine. */
export function colourProblems(colours: Colours, theme?: string): ColourProblem[] {
  return rulesFor(theme)
    .map(rule => ({ role: rule.role, on: rule.on, what: rule.what, ratio: contrast(colours[rule.role], colours[rule.on]), needed: rule.ratio }))
    .filter(p => p.ratio < p.needed)
}

/** The same palette with each failing colour nudged just far enough to be readable. */
export function fixColours(colours: Colours, theme?: string): Colours {
  const fixed = { ...colours }
  fixed.text = readable(fixed.text, fixed.ground, 4.5)
  // Text cannot be moved to suit two grounds at once: a clashing panel colour becomes a tint of the background instead.
  if (contrast(fixed.text, fixed.surface) < 4.5) fixed.surface = mix(fixed.ground, fixed.text, 0.07)
  for (const rule of rulesFor(theme)) {
    const moved = rule.adjust ?? rule.role, against = moved === rule.role ? rule.on : rule.role
    fixed[moved] = readable(fixed[moved], fixed[against], rule.ratio)
  }
  return fixed
}

// ------------------------------------------------------------------- design

export interface Design {
  version: 2
  theme: string
  /** The starting point the couple chose; their own colours may differ from it. */
  preset: string
  colours: Colours
  /** Which typeface each kind of text is set in. */
  lettering: Lettering
  /** Theme-specific choices (emblem, backdrop, …). */
  options: Record<string, string>
  /** Owner-only escape hatch for one-off adjustments. */
  customCss: string
}

export const themesFor = (slug: string) =>
  Object.fromEntries(Object.entries(THEMES).filter(([, t]) => !t.onlyFor || t.onlyFor.includes(slug)))

/** Designs saved before colours were free had one of three palettes as a theme option. */
const LEGACY_PALETTES: Record<string, string> = { gold: 'nocturne-gold', bone: 'nocturne-bone', oxblood: 'nocturne-oxblood' }

/**
 * Turn anything (a browser's request, a stored design of any age) into a valid design.
 * Unknown choices fall back to the previous design, then to the preset, then to the theme's defaults.
 * Colours must be plain hex. `customCss` is never taken from the input: see `setDesign`.
 */
export function normaliseDesign(input: unknown, slug: string, previous?: Design): Design {
  const raw = (input ?? {}) as Partial<Design> & { options?: Record<string, unknown>, colours?: Record<string, unknown> }
  const available = themesFor(slug)
  const theme = typeof raw.theme === 'string' && available[raw.theme] ? raw.theme : (previous && available[previous.theme] ? previous.theme : DEFAULT_THEME)
  const definition = THEMES[theme]!
  const sameTheme = previous?.theme === theme

  const legacy = LEGACY_PALETTES[String(raw.options?.palette ?? '')]
  const asked = typeof raw.preset === 'string' ? raw.preset : legacy
  const preset = asked && PRESETS[asked]?.theme === theme ? asked : (sameTheme ? previous!.preset : definition.preset)
  // Choosing a different preset (and sending no colours) means "start from that preset".
  const base = preset === previous?.preset && sameTheme ? previous!.colours : PRESETS[preset]!.colours
  const colours = {} as Colours
  for (const role of ROLES) {
    const value = raw.colours?.[role]
    colours[role] = isHex(value) ? normaliseHex(value) : base[role]
  }

  const options: Record<string, string> = {}
  for (const [key, option] of Object.entries(definition.options)) {
    const value = raw.options?.[key]
    const kept = sameTheme ? previous!.options[key] : undefined
    options[key] = typeof value === 'string' && value in option.choices ? value : (kept !== undefined && kept in option.choices ? kept : definition.defaults[key]!)
  }
  // A style brings its own typefaces; changing style starts from them.
  const lettering = normaliseLettering((raw as { lettering?: unknown }).lettering, sameTheme ? previous!.lettering : definition.lettering)
  return { version: 2, theme, preset, colours, lettering, options, customCss: previous?.customCss ?? '' }
}

/** A stored design of any age, brought up to date. Unlike a request, its own `customCss` is trusted. */
export function readDesign(stored: unknown, slug: string): Design {
  const css = (stored as { customCss?: unknown } | null)?.customCss
  return { ...normaliseDesign(stored, slug), customCss: typeof css === 'string' ? css : '' }
}
