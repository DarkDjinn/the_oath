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
  // ---- the gallery styles: one shared page (app/themes/gallery), each with its own art
  still: {
    name: 'Still',
    description: 'Quiet contemporary typography, generous space, and a single graceful line let your words lead.',
    options: {
      divider: { label: 'Divider', topic: 'ornaments', choices: { rule: 'Single rule', dots: 'Twin dots', none: 'None' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { square: 'Sharp rectangle', pill: 'Soft capsule', underline: 'Underlined text' } },
      'photo-mode': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', inset: 'Editorial inset', pair: 'Footer pair' } },
    },
    defaults: { divider: 'rule', cta: 'square', 'photo-mode': 'none' },
    preset: 'still-porcelain',
    lettering: { display: 'heebo', latin: 'poiret', body: 'assistant', numeral: 'rubik' },
    photos: { hero: 'Optional restrained portrait, cropped as an editorial inset below the headline.', second: 'Optional second portrait paired at the end of the details section.' },
  },
  'jaffa-sun': {
    name: 'Jaffa Sun',
    description: 'A breezy Mediterranean celebration of sunlit plaster, colourful tiles, and summer evenings.',
    options: {
      tile: { label: 'Tile motif', topic: 'ornaments', choices: { sun: 'Sunburst', olive: 'Olive branch', citrus: 'Citrus slice' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { tile: 'Enamel tile', solid: 'Solid colour', link: 'Underlined link' } },
      'photo-mode': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', postcard: 'Postcard insert', pair: 'Tile-frame pair' } },
    },
    defaults: { tile: 'sun', cta: 'tile', 'photo-mode': 'none' },
    preset: 'jaffa-sun-chalk-citrus',
    lettering: { display: 'bellefair', latin: 'bellefair', body: 'rubik', numeral: 'bellefair' },
    photos: { hero: 'Optional bright outdoor portrait in a small postcard-shaped frame.', second: 'Optional candid in a paired tile-like frame beneath venue details.' },
  },
  'velvet-deco': {
    name: 'Velvet Deco',
    description: 'A glamorous 1920s-inspired invitation of stepped geometry, bold symmetry, and polished metallic lines.',
    options: {
      crest: { label: 'Crest', topic: 'ornaments', choices: { fan: 'Stepped fan', sunburst: 'Sunburst rays', diamond: 'Triple diamond' } },
      frame: { label: 'Frame detail', topic: 'ornaments', choices: { double: 'Double lines', corners: 'Corner steps', none: 'No frame' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { chamfer: 'Chamfered plaque', outline: 'Geometric outline', solid: 'Solid block' } },
    },
    defaults: { crest: 'fan', frame: 'double', cta: 'chamfer' },
    preset: 'velvet-deco-ivory-brass',
    lettering: { display: 'suez', latin: 'poiret', body: 'frank-ruhl', numeral: 'poiret' },
    photos: { hero: 'Optional formally posed couple portrait inside a narrow stepped frame.', second: 'Optional black-and-white detail shot below the schedule in a geometric inset.' },
  },
  herbarium: {
    name: 'Herbarium',
    description: 'A tender botanical field journal with delicate pressed plants and handwritten-science charm.',
    options: {
      specimen: { label: 'Botanical specimen', topic: 'ornaments', choices: { eucalyptus: 'Eucalyptus', lavender: 'Lavender', chamomile: 'Chamomile' } },
      margin: { label: 'Page margin', topic: 'ornaments', choices: { journal: 'Journal rules', open: 'Open paper', catalogue: 'Catalogue labels' } },
      'photo-mode': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', mounted: 'Paper-mounted print', diptych: 'Small diptych' } },
    },
    defaults: { specimen: 'eucalyptus', margin: 'journal', 'photo-mode': 'none' },
    preset: 'herbarium-pressed-sage',
    lettering: { display: 'frank-ruhl', latin: 'cormorant', body: 'frank-ruhl', numeral: 'cormorant' },
    photos: { hero: 'Optional soft portrait displayed as a small archival mounted print.', second: 'Optional close-up memory beneath the invitation, captioned like a collected specimen.' },
  },
  'saffron-dunes': {
    name: 'Saffron Dunes',
    description: 'Earthy, tactile desert romance built from horizons, woven marks, and sun-warmed geometry.',
    options: {
      horizon: { label: 'Desert motif', topic: 'ornaments', choices: { sun: 'Sun and dunes', weave: 'Woven diamonds', stars: 'Desert stars' } },
      border: { label: 'Border', topic: 'ornaments', choices: { fringe: 'Fringed edge', woven: 'Woven stripe', none: 'No border' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { clay: 'Clay capsule', stitched: 'Stitched outline', flat: 'Flat rectangle' } },
    },
    defaults: { horizon: 'sun', border: 'fringe', cta: 'clay' },
    preset: 'saffron-dunes-salt-sand',
    lettering: { display: 'amatic', latin: 'amatic', body: 'rubik', numeral: 'amatic' },
    photos: { hero: 'Optional sunset portrait framed by two abstract horizon shapes.', second: 'Optional candid in a horizontal, woven-edged strip after the welcome text.' },
  },
  ma: {
    name: 'Ma',
    description: 'A serene Japanese-inspired composition where ink marks, asymmetry, and purposeful emptiness create intimacy.',
    options: {
      mark: { label: 'Ink motif', topic: 'ornaments', choices: { enso: 'Open ink circle', branch: 'Single branch', fan: 'Folded fan' } },
      layout: { label: 'Composition', topic: 'ornaments', choices: { offset: 'Asymmetric', centred: 'Quiet centre', column: 'Side column' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { ink: 'Solid ink bar', hairline: 'Hairline frame', seal: 'Seal square' } },
    },
    defaults: { mark: 'enso', layout: 'offset', cta: 'ink' },
    preset: 'ma-rice-paper',
    lettering: { display: 'heebo', latin: 'poiret', body: 'assistant', numeral: 'assistant' },
    photos: { hero: 'Optional single documentary-style portrait in a small understated crop.', second: 'Optional narrow landscape detail photo placed below the event information.' },
  },
  'postmarked-love': {
    name: 'Postmarked Love',
    description: 'An old-world invitation card with letterpress rules, postal stamps, and the warmth of a handwritten keepsake.',
    options: {
      stamp: { label: 'Postage stamp', topic: 'ornaments', choices: { heart: 'Heart seal', flower: 'Flower stamp', asterisk: 'Printer mark' } },
      edge: { label: 'Paper edge', topic: 'ornaments', choices: { perforated: 'Perforated', double: 'Double rule', clean: 'Clean cut' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { ticket: 'Ticket stub', boxed: 'Boxed label', postage: 'Postage stamp' } },
    },
    defaults: { stamp: 'heart', edge: 'perforated', cta: 'ticket' },
    preset: 'postmarked-love-cream-ledger',
    lettering: { display: 'david', latin: 'playfair', body: 'david', numeral: 'playfair' },
    photos: { hero: 'Optional portrait as a small sepia-style print within the paper card.', second: 'Optional archival candid treated as a second tiny postage-window inset.' },
  },
  'happy-accident': {
    name: 'Happy Accident',
    description: 'A bright, delightfully offbeat party invite drawn with confident doodles and a little deliberate mischief.',
    options: {
      doodles: { label: 'Party doodles', topic: 'ornaments', choices: { balloons: 'Balloons', stars: 'Wonky stars', squiggles: 'Squiggles' } },
      density: { label: 'Doodle density', topic: 'ornaments', choices: { subtle: 'A little', medium: 'Just enough', lively: 'More playful' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { sticker: 'Sticker oval', bubble: 'Speech bubble', rect: 'Bold rectangle' } },
    },
    defaults: { doodles: 'stars', density: 'subtle', cta: 'sticker' },
    preset: 'happy-accident-bubblegum',
    lettering: { display: 'secular', latin: 'rubik', body: 'rubik', numeral: 'rubik' },
    photos: { hero: 'Optional funny candid in a tilted faux-sticker frame.', second: 'Optional small square photo with a short doodled caption beside it.' },
  },
  'jerusalem-stone': {
    name: 'Jerusalem Stone',
    description: 'A dignified, locally rooted celebration inspired by pale Jerusalem stone and timeless Hebrew lettering.',
    options: {
      emblem: { label: 'Stone emblem', topic: 'ornaments', choices: { pomegranate: 'Pomegranate', olive: 'Olive branch', star: 'Six-point geometry' } },
      masonry: { label: 'Stone detail', topic: 'ornaments', choices: { courses: 'Stone courses', keystone: 'Corner keystones', none: 'Bare stone' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { plaque: 'Engraved plaque', outline: 'Thin outline', solid: 'Solid stone' } },
    },
    defaults: { emblem: 'pomegranate', masonry: 'courses', cta: 'plaque' },
    preset: 'jerusalem-stone-limestone',
    lettering: { display: 'frank-ruhl', latin: 'bona-nova', body: 'david', numeral: 'bona-nova' },
    photos: { hero: 'Optional formal portrait in a modest rectangular stone-line frame.', second: 'Optional architectural or family detail photo below the event details.' },
  },
  'golden-hour-groove': {
    name: 'Golden Hour Groove',
    description: 'A happy retro-70s celebration of chunky curves, warm stripes, flower power, and optimistic colour.',
    options: {
      groove: { label: 'Retro motif', topic: 'ornaments', choices: { rainbow: 'Rainbow arches', flower: 'Groovy flower', record: 'Vinyl record' } },
      bands: { label: 'Background bands', topic: 'ornaments', choices: { arches: 'Big arches', stripes: 'Horizontal stripes', solid: 'Solid field' } },
      cta: { label: 'RSVP button', topic: 'button', choices: { capsule: 'Chunky capsule', tabs: 'Stacked tabs', outline: 'Thick outline' } },
    },
    defaults: { groove: 'rainbow', bands: 'arches', cta: 'capsule' },
    preset: 'golden-hour-groove-tangerine',
    lettering: { display: 'amatic', latin: 'playball', body: 'rubik', numeral: 'amatic' },
    photos: { hero: 'Optional playful portrait clipped into a round record-sleeve crop.', second: 'Optional candid pair assembled as a compact 1970s-style photo strip.' },
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
  'still-porcelain': {
    name: 'Porcelain',
    theme: 'still',
    colours: { ground: '#F6F4EF', surface: '#FFFFFF', text: '#1B2524', muted: '#505C5B', accent: '#31574F', accent2: '#AE816E' },
  },
  'still-charcoal': {
    name: 'Charcoal',
    theme: 'still',
    colours: { ground: '#151C1C', surface: '#24302F', text: '#F7F4EE', muted: '#CDD4CD', accent: '#A8D3C1', accent2: '#D6B7A4' },
  },
  'still-slate': {
    name: 'Slate',
    theme: 'still',
    colours: { ground: '#E8EDF0', surface: '#F9FAFB', text: '#182A34', muted: '#485960', accent: '#31586D', accent2: '#A16F4B' },
  },
  'jaffa-sun-chalk-citrus': {
    name: 'Chalk Citrus',
    theme: 'jaffa-sun',
    colours: { ground: '#FCF5E6', surface: '#FFFDF6', text: '#253E40', muted: '#526467', accent: '#126D78', accent2: '#C8772B' },
  },
  'jaffa-sun-indigo-courtyard': {
    name: 'Indigo Courtyard',
    theme: 'jaffa-sun',
    colours: { ground: '#102A3F', surface: '#1C3E52', text: '#FFF4D9', muted: '#D2D5C7', accent: '#FFD27A', accent2: '#81D5CF' },
  },
  'jaffa-sun-terra-rose': {
    name: 'Terra Rose',
    theme: 'jaffa-sun',
    colours: { ground: '#F3E3D8', surface: '#FFF7EC', text: '#442E30', muted: '#6B4F4A', accent: '#A24342', accent2: '#297D7B' },
  },
  'velvet-deco-ivory-brass': {
    name: 'Ivory Brass',
    theme: 'velvet-deco',
    colours: { ground: '#F6EEE2', surface: '#FFFCF4', text: '#242936', muted: '#5A5861', accent: '#746022', accent2: '#9D4D4D' },
  },
  'velvet-deco-black-onyx': {
    name: 'Black Onyx',
    theme: 'velvet-deco',
    colours: { ground: '#121518', surface: '#25282B', text: '#FAF1DF', muted: '#D5CAB9', accent: '#DDC07C', accent2: '#95B0A1' },
  },
  'velvet-deco-deep-peacock': {
    name: 'Deep Peacock',
    theme: 'velvet-deco',
    colours: { ground: '#092A33', surface: '#19414B', text: '#F4F0E5', muted: '#C4D1CA', accent: '#E8AC68', accent2: '#7DD1C3' },
  },
  'herbarium-pressed-sage': {
    name: 'Pressed Sage',
    theme: 'herbarium',
    colours: { ground: '#F6F5EA', surface: '#FFFFFF', text: '#304137', muted: '#576357', accent: '#567344', accent2: '#AF6D87' },
  },
  'herbarium-forest-study': {
    name: 'Forest Study',
    theme: 'herbarium',
    colours: { ground: '#172B25', surface: '#294036', text: '#F4F0DE', muted: '#C8D5C7', accent: '#B5D39C', accent2: '#F1B1A8' },
  },
  'herbarium-lilac-parchment': {
    name: 'Lilac Parchment',
    theme: 'herbarium',
    colours: { ground: '#F6EAF2', surface: '#FFFFFF', text: '#443349', muted: '#6C5268', accent: '#7B4979', accent2: '#48785A' },
  },
  'saffron-dunes-salt-sand': {
    name: 'Salt Sand',
    theme: 'saffron-dunes',
    colours: { ground: '#F6EBDC', surface: '#FFF9F0', text: '#483628', muted: '#6C574B', accent: '#9B513A', accent2: '#687D72' },
  },
  'saffron-dunes-midnight-clay': {
    name: 'Midnight Clay',
    theme: 'saffron-dunes',
    colours: { ground: '#281F24', surface: '#3B2C34', text: '#FAEDE0', muted: '#D7C5C6', accent: '#E7B27D', accent2: '#CBA8BD' },
  },
  'saffron-dunes-ochre-canyon': {
    name: 'Ochre Canyon',
    theme: 'saffron-dunes',
    colours: { ground: '#EEE0C0', surface: '#F9F2DF', text: '#443422', muted: '#6E5B44', accent: '#8A5829', accent2: '#B2624C' },
  },
  'ma-rice-paper': {
    name: 'Rice Paper',
    theme: 'ma',
    colours: { ground: '#F7F4ED', surface: '#FFFFFF', text: '#262C2A', muted: '#59625E', accent: '#4F6358', accent2: '#A24B3C' },
  },
  'ma-sumi-ink': {
    name: 'Sumi Ink',
    theme: 'ma',
    colours: { ground: '#141A1A', surface: '#26302F', text: '#F7F3EB', muted: '#C9CFCB', accent: '#C2D6CB', accent2: '#EE9882' },
  },
  'ma-indigo-wash': {
    name: 'Indigo Wash',
    theme: 'ma',
    colours: { ground: '#E8EDF1', surface: '#FFFFFF', text: '#253947', muted: '#55646F', accent: '#42657B', accent2: '#B45B4D' },
  },
  'postmarked-love-cream-ledger': {
    name: 'Cream Ledger',
    theme: 'postmarked-love',
    colours: { ground: '#F4EDDF', surface: '#FFFAF0', text: '#342E29', muted: '#64594E', accent: '#7A493B', accent2: '#596C54' },
  },
  'postmarked-love-inkbound': {
    name: 'Inkbound',
    theme: 'postmarked-love',
    colours: { ground: '#1F2528', surface: '#343B3E', text: '#F9F2E6', muted: '#CBD1C7', accent: '#E0B88C', accent2: '#B4C2B4' },
  },
  'postmarked-love-faded-blue': {
    name: 'Faded Blue',
    theme: 'postmarked-love',
    colours: { ground: '#E9F0ED', surface: '#FFFFFF', text: '#273B43', muted: '#536167', accent: '#496875', accent2: '#A16E5A' },
  },
  'happy-accident-bubblegum': {
    name: 'Bubblegum',
    theme: 'happy-accident',
    colours: { ground: '#FFF4F0', surface: '#FFFFFF', text: '#343247', muted: '#655D69', accent: '#AA3E74', accent2: '#3D7E86' },
  },
  'happy-accident-afterparty': {
    name: 'Afterparty',
    theme: 'happy-accident',
    colours: { ground: '#27213F', surface: '#3A3155', text: '#FFF3DF', muted: '#D7CBE2', accent: '#FFB9D1', accent2: '#F8D270' },
  },
  'happy-accident-confetti-mint': {
    name: 'Confetti Mint',
    theme: 'happy-accident',
    colours: { ground: '#E9F7F0', surface: '#FFFFFF', text: '#203C39', muted: '#536662', accent: '#256C67', accent2: '#C65B75' },
  },
  'jerusalem-stone-limestone': {
    name: 'Limestone',
    theme: 'jerusalem-stone',
    colours: { ground: '#F4EFE4', surface: '#FFFBF3', text: '#3D392E', muted: '#675F51', accent: '#716039', accent2: '#717C57' },
  },
  'jerusalem-stone-evening-stone': {
    name: 'Evening Stone',
    theme: 'jerusalem-stone',
    colours: { ground: '#202B31', surface: '#334148', text: '#F5EBDD', muted: '#D0D4CF', accent: '#E8BC81', accent2: '#A4C7AE' },
  },
  'jerusalem-stone-rose-sandstone': {
    name: 'Rose Sandstone',
    theme: 'jerusalem-stone',
    colours: { ground: '#F5E7DF', surface: '#FFF9F3', text: '#4E3431', muted: '#73564E', accent: '#8D5242', accent2: '#667B6C' },
  },
  'golden-hour-groove-tangerine': {
    name: 'Tangerine',
    theme: 'golden-hour-groove',
    colours: { ground: '#FDF0D6', surface: '#FFF8E7', text: '#4A3028', muted: '#71584E', accent: '#A24924', accent2: '#557D61' },
  },
  'golden-hour-groove-disco-night': {
    name: 'Disco Night',
    theme: 'golden-hour-groove',
    colours: { ground: '#24203E', surface: '#373151', text: '#FCF0DB', muted: '#D5C9D7', accent: '#FFB968', accent2: '#F397B4' },
  },
  'golden-hour-groove-avocado': {
    name: 'Avocado',
    theme: 'golden-hour-groove',
    colours: { ground: '#E9E7CB', surface: '#F7F4E1', text: '#303F2C', muted: '#5B624E', accent: '#5C6D29', accent2: '#AE613B' },
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
