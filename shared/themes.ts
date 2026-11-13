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
  // ---- the twenty expansion styles: each its own composition (app/themes/remix), one shared page shell
  still: {
    name: 'Still / Electric Editorial',
    description: 'Big, bold, and breathtakingly simple: high-fashion typography meets joyful colour and graphic punctuation.',
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
    name: 'Jaffa Sun / Postcard Paradise',
    description: 'A sun-soaked Mediterranean travel poster: cobalt tiles, floating sails, citrus, and pure summer celebration.',
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
    name: 'Velvet Deco / Champagne Tower',
    description: 'A dazzling jazz-age soirée of stepped skyscrapers, champagne fountains, and architectural gold.',
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
    name: 'Herbarium / Wildflower Edition',
    description: 'A botanical love story bursting out of a field-guide foldout, with giant specimen blooms and punchy labels.',
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
    name: 'Saffron Dunes / Desert Festival',
    description: 'An immersive desert festival tapestry of giant setting suns, woven stripes, tassels, and joyous warm colour.',
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
    name: 'Ma / Paper Lanterns',
    description: 'A contemporary Japanese-inspired celebration of flying paper cranes, bright lanterns, and sculptural negative space.',
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
    name: 'Postmarked Love / Air Mail',
    description: 'A giant love letter has arrived: airmail borders, oversized stamps, and playful handwritten postal ephemera.',
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
    name: 'Happy Accident / Love Parade',
    description: 'A funny, fearless doodle parade of googly-eyed flowers, bouncing balloons, and sticker-book chaos.',
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
    name: 'Jerusalem Stone / City of Joy',
    description: 'Warm golden Jerusalem roofs at sunset meet monumental Hebrew lettering and celebratory stained-glass colour.',
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
    name: 'Golden Hour Groove / Disco Bouquet',
    description: 'A joyful psychedelic wedding poster of giant daisies, molten colour bands, disco rings, and groovy typography.',
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
  'mazal-tov-papercut': {
    name: 'Mazal Tov!',
    description: 'An explosion of Jewish folk-art joy: dancing birds, oversized papercut flowers, and a brilliantly colourful celebration.',
    options: {
      papercut: { label: 'Papercut design', topic: 'ornaments', choices: { doves: 'Doves & branches', pomegranates: 'Pomegranates', floral: 'Festival flowers' } },
      'paper-edge': { label: 'Paper border', topic: 'ornaments', choices: { lace: 'Scalloped cutout', diamond: 'Diamond cutout', clean: 'Open edges' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { seal: 'Cut-paper seal', ticket: 'Festival ticket', solid: 'Solid capsule' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', roundel: 'Small roundel', below: 'Photo below names' } },
    },
    defaults: { papercut: 'doves', 'paper-edge': 'lace', 'rsvp-button': 'seal', 'photo-layout': 'none' },
    preset: 'mazal-tov-papercut-jubilant-ivory',
    lettering: { display: 'suez', latin: 'bona-nova', body: 'frank-ruhl', numeral: 'bona-nova' },
    photos: { hero: 'Optional circular couple portrait nested beneath the papercut crest.', second: 'Optional small photo as a separate card near the event details.' },
  },
  'chuppah-jubilee': {
    name: 'Under the Chuppah',
    description: 'Step into a sunlit chuppah dressed in swaying fabric, giant blossoms, and joyful festival ribbons.',
    options: {
      canopy: { label: 'Chuppah canopy', topic: 'ornaments', choices: { scalloped: 'Scalloped fabric', striped: 'Festive stripes', floral: 'Flower garlands' } },
      hanging: { label: 'Hanging ornaments', topic: 'ornaments', choices: { ribbons: 'Ribbon tassels', lanterns: 'Paper lanterns', petals: 'Flower strings' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { banner: 'Canopy banner', pill: 'Soft capsule', outlined: 'Outlined label' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', 'under-canopy': 'Under the canopy', below: 'Below the welcome' } },
    },
    defaults: { canopy: 'scalloped', hanging: 'ribbons', 'rsvp-button': 'banner', 'photo-layout': 'none' },
    preset: 'chuppah-jubilee-festival-linen',
    lettering: { display: 'bellefair', latin: 'playfair', body: 'assistant', numeral: 'bellefair' },
    photos: { hero: 'Optional modest inset beneath the illustrated canopy, never replacing the canopy.', second: 'Optional candid photo beneath the RSVP details or in the footer.' },
  },
  'seven-blessings': {
    name: 'Seven Joys',
    description: 'Seven glowing jewel rosettes surround your names in a radiant celebration of the Sheva Brachot.',
    options: {
      medallions: { label: 'Seven medallions', topic: 'ornaments', choices: { rosettes: 'Seven rosettes', facets: 'Jewel facets', stars: 'Seven tiny stars' } },
      border: { label: 'Ceremonial border', topic: 'ornaments', choices: { jewel: 'Jewel corners', beads: 'Beaded lines', none: 'No border' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { gem: 'Faceted plaque', seal: 'Round seal', solid: 'Solid button' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', portrait: 'Portrait window', diptych: 'Formal diptych' } },
    },
    defaults: { medallions: 'rosettes', border: 'jewel', 'rsvp-button': 'gem', 'photo-layout': 'none' },
    preset: 'seven-blessings-ivory-jewel',
    lettering: { display: 'frank-ruhl', latin: 'cormorant', body: 'noto-serif', numeral: 'cormorant' },
    photos: { hero: 'Optional formal portrait set below the medallion constellation.', second: 'Optional second portrait displayed as a quiet gallery tile below the schedule.' },
  },
  'rimon-fiesta': {
    name: 'Rimon Riot',
    description: 'A technicolour pomegranate party, inspired by Sephardi decorative arts and festive geometric mosaics.',
    options: {
      tiles: { label: 'Mosaic pattern', topic: 'ornaments', choices: { diamonds: 'Diamond tessellation', flowers: 'Mosaic flowers', arches: 'Geometric arches' } },
      fruit: { label: 'Festival fruit', topic: 'ornaments', choices: { rimon: 'Pomegranate pair', branches: 'Pomegranate branches', none: 'Geometry only' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { tile: 'Decorated tile', enamel: 'Enamel capsule', solid: 'Solid button' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', tile: 'Mosaic photo tile', stripe: 'Photo strip' } },
    },
    defaults: { tiles: 'diamonds', fruit: 'rimon', 'rsvp-button': 'tile', 'photo-layout': 'none' },
    preset: 'rimon-fiesta-citrus-turquoise',
    lettering: { display: 'suez', latin: 'bellefair', body: 'rubik', numeral: 'bellefair' },
    photos: { hero: 'Optional photo inside a geometric tile frame; full mosaic title remains without it.', second: 'Optional candid as a single tile in the venue section.' },
  },
  'klezmer-confetti': {
    name: 'Simcha Soundtrack',
    description: 'A Jewish wedding that looks like the most joyful concert poster in town—music, dancing, and all.',
    options: {
      instrument: { label: 'Musical motif', topic: 'ornaments', choices: { violin: 'Violin & notes', clarinet: 'Clarinet & notes', accordion: 'Accordion keys' } },
      confetti: { label: 'Celebration accents', topic: 'ornaments', choices: { ribbons: 'Dancing ribbons', notes: 'Music notes', dots: 'Colourful dots' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { ticket: 'Concert ticket', round: 'Round-ended strip', solid: 'Solid block' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', record: 'Record sleeve', polaroid: 'Playful polaroid' } },
    },
    defaults: { instrument: 'violin', confetti: 'ribbons', 'rsvp-button': 'ticket', 'photo-layout': 'none' },
    preset: 'klezmer-confetti-festival-peach',
    lettering: { display: 'secular', latin: 'amatic', body: 'rubik', numeral: 'amatic' },
    photos: { hero: 'Optional lively portrait as a concert-poster insert below the opening.', second: 'Optional candid in a lightly tilted mini print beneath the event information.' },
  },
  'firework-finale': {
    name: 'Big Bang Love',
    description: 'A midnight-sky wedding announcement with monumental numerals, electric bursts, and a glorious grand finale.',
    options: {
      burst: { label: 'Fireworks style', topic: 'ornaments', choices: { starbursts: 'Fine starbursts', comets: 'Long comets', sparkles: 'Glitter dots' } },
      skyline: { label: 'Horizon line', topic: 'ornaments', choices: { city: 'City skyline', hills: 'Rolling hills', none: 'Open sky' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { glow: 'Glow-outline pill', burst: 'Burst medallion', solid: 'Solid button' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', oval: 'Floating oval', filmstrip: 'Evening filmstrip' } },
    },
    defaults: { burst: 'starbursts', skyline: 'city', 'rsvp-button': 'glow', 'photo-layout': 'none' },
    preset: 'firework-finale-cobalt-night',
    lettering: { display: 'secular', latin: 'playfair', body: 'assistant', numeral: 'playfair' },
    photos: { hero: 'Optional low-contrast portrait below the fireworks headline, never as the sky itself.', second: 'Optional dusk photo along the schedule, in its own panel.' },
  },
  'poolside-vows': {
    name: 'Splash!',
    description: 'The wedding is a pool party: graphic water, retro resort signage, and sunshine in every corner.',
    options: {
      water: { label: 'Water pattern', topic: 'ornaments', choices: { ripples: 'Sunlit ripples', waves: 'Rolling waves', tiles: 'Pool tiles' } },
      'summer-icon': { label: 'Summer decoration', topic: 'ornaments', choices: { umbrella: 'Striped parasol', sun: 'Happy sun', flamingo: 'Flamingo silhouette' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { float: 'Pool float ring', sunny: 'Sunny pill', tile: 'Pool tile' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', postcard: 'Holiday postcard', polaroids: 'Two polaroids' } },
    },
    defaults: { water: 'ripples', 'summer-icon': 'umbrella', 'rsvp-button': 'sunny', 'photo-layout': 'none' },
    preset: 'poolside-vows-aqua-daylight',
    lettering: { display: 'rubik', latin: 'playball', body: 'assistant', numeral: 'rubik' },
    photos: { hero: 'Optional summer portrait as a postcard below the large sun ornament.', second: 'Optional second candid in a pool-tile framed footer card.' },
  },
  'confetti-couture': {
    name: 'Ribbon Rebel',
    description: 'Runway-worthy wedding joy: giant sculptural bows, impossible colours, and a confetti-soaked editorial layout.',
    options: {
      ribbons: { label: 'Ribbon sculpture', topic: 'ornaments', choices: { bow: 'Giant couture bow', loops: 'Ribbon loops', streamers: 'Long streamers' } },
      confetti: { label: 'Confetti shapes', topic: 'ornaments', choices: { discs: 'Metallic discs', diamonds: 'Tiny diamonds', stars: 'Mini stars' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { label: 'Designer label', ribbon: 'Ribbon end', pill: 'Soft capsule' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', editorial: 'Editorial inset', strip: 'Fashion strip' } },
    },
    defaults: { ribbons: 'bow', confetti: 'diamonds', 'rsvp-button': 'label', 'photo-layout': 'none' },
    preset: 'confetti-couture-blush-balloon',
    lettering: { display: 'heebo', latin: 'playfair', body: 'assistant', numeral: 'poiret' },
    photos: { hero: 'Optional fashion-editorial portrait with generous margins and no decorative placeholder.', second: 'Optional second editorial image as a slim strip between venue and RSVP.' },
  },
  'gala-glow': {
    name: 'Opening Night',
    description: 'Velvet curtains rise on your once-in-a-lifetime night, with luminous stage lettering and marquee glamour.',
    options: {
      chandelier: { label: 'Chandelier design', topic: 'ornaments', choices: { crystal: 'Crystal drops', orb: 'Glass orbs', tiered: 'Three tiers' } },
      drapery: { label: 'Stage drapery', topic: 'ornaments', choices: { curtain: 'Open curtains', swags: 'Fabric swags', clean: 'No drapes' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { plaque: 'Ballroom plaque', bevel: 'Bevelled bar', outline: 'Outlined pill' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', gala: 'Formal portrait', side: 'Side-by-side pair' } },
    },
    defaults: { chandelier: 'crystal', drapery: 'curtain', 'rsvp-button': 'plaque', 'photo-layout': 'none' },
    preset: 'gala-glow-midnight-ballroom',
    lettering: { display: 'bellefair', latin: 'great-vibes', body: 'frank-ruhl', numeral: 'cormorant' },
    photos: { hero: 'Optional formal portrait in a lower ballroom-card panel; chandelier still leads the hero.', second: 'Optional second formal portrait beneath the event programme.' },
  },
  'neon-afterglow': {
    name: 'LOVE.exe',
    description: 'An irresistible late-night wedding rave with holographic geometry, fluorescent type, and cosmic energy.',
    options: {
      'neon-shape': { label: 'Neon centerpiece', topic: 'ornaments', choices: { heart: 'Electric heart', infinity: 'Neon loops', star: 'Double star' } },
      background: { label: 'Background pattern', topic: 'ornaments', choices: { grid: 'Perspective grid', dots: 'Electric dots', rays: 'Laser rays' } },
      'rsvp-button': { label: 'RSVP button', topic: 'button', choices: { neon: 'Neon outline', block: 'Electric block', glow: 'Glow capsule' } },
      'photo-layout': { label: 'Photo treatment', topic: 'photos', choices: { none: 'No photos', poster: 'Poster cutout', split: 'Split screen' } },
    },
    defaults: { 'neon-shape': 'heart', background: 'grid', 'rsvp-button': 'neon', 'photo-layout': 'none' },
    preset: 'neon-afterglow-ultraviolet-club',
    lettering: { display: 'secular', latin: 'poiret', body: 'rubik', numeral: 'poiret' },
    photos: { hero: 'Optional portrait in a rectangular club-poster inset below the neon name stack.', second: 'Optional secondary candid in an edge-lit tile near the bottom.' },
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
  // ---- the twenty expansion styles
  'still-porcelain': {
    name: 'Porcelain',
    theme: 'still',
    colours: { ground: '#f8f2e9', surface: '#fffdf7', text: '#20243b', muted: '#5d5b69', accent: '#a5224c', accent2: '#116e86' },
  },
  'still-charcoal': {
    name: 'Charcoal',
    theme: 'still',
    colours: { ground: '#151c1c', surface: '#24302f', text: '#f7f4ee', muted: '#cdd4cd', accent: '#a8d3c1', accent2: '#d6b7a4' },
  },
  'still-slate': {
    name: 'Slate',
    theme: 'still',
    colours: { ground: '#e8edf0', surface: '#f9fafb', text: '#182a34', muted: '#485960', accent: '#31586d', accent2: '#a16f4b' },
  },
  'jaffa-sun-chalk-citrus': {
    name: 'Chalk Citrus',
    theme: 'jaffa-sun',
    colours: { ground: '#fff1d8', surface: '#fffcf1', text: '#26334f', muted: '#64585a', accent: '#1d657e', accent2: '#b04731' },
  },
  'jaffa-sun-indigo-courtyard': {
    name: 'Indigo Courtyard',
    theme: 'jaffa-sun',
    colours: { ground: '#102a3f', surface: '#1c3e52', text: '#fff4d9', muted: '#d2d5c7', accent: '#ffd27a', accent2: '#81d5cf' },
  },
  'jaffa-sun-terra-rose': {
    name: 'Terra Rose',
    theme: 'jaffa-sun',
    colours: { ground: '#f3e3d8', surface: '#fff7ec', text: '#442e30', muted: '#6b4f4a', accent: '#a24342', accent2: '#297d7b' },
  },
  'velvet-deco-ivory-brass': {
    name: 'Ivory Brass',
    theme: 'velvet-deco',
    colours: { ground: '#fff3dc', surface: '#fffcf4', text: '#2a2033', muted: '#615666', accent: '#79275e', accent2: '#176c66' },
  },
  'velvet-deco-black-onyx': {
    name: 'Black Onyx',
    theme: 'velvet-deco',
    colours: { ground: '#121518', surface: '#25282b', text: '#faf1df', muted: '#d5cab9', accent: '#ddc07c', accent2: '#95b0a1' },
  },
  'velvet-deco-deep-peacock': {
    name: 'Deep Peacock',
    theme: 'velvet-deco',
    colours: { ground: '#092a33', surface: '#19414b', text: '#f4f0e5', muted: '#c4d1ca', accent: '#e8ac68', accent2: '#7dd1c3' },
  },
  'herbarium-pressed-sage': {
    name: 'Pressed Sage',
    theme: 'herbarium',
    colours: { ground: '#f7f4de', surface: '#fffdf6', text: '#263b31', muted: '#566056', accent: '#9b2c56', accent2: '#386c5b' },
  },
  'herbarium-forest-study': {
    name: 'Forest Study',
    theme: 'herbarium',
    colours: { ground: '#172b25', surface: '#294036', text: '#f4f0de', muted: '#c8d5c7', accent: '#b5d39c', accent2: '#f1b1a8' },
  },
  'herbarium-lilac-parchment': {
    name: 'Lilac Parchment',
    theme: 'herbarium',
    colours: { ground: '#f6eaf2', surface: '#ffffff', text: '#443349', muted: '#6c5268', accent: '#7b4979', accent2: '#48785a' },
  },
  'saffron-dunes-salt-sand': {
    name: 'Salt Sand',
    theme: 'saffron-dunes',
    colours: { ground: '#fff0d4', surface: '#fff8e8', text: '#402b2a', muted: '#765448', accent: '#9c394c', accent2: '#376e78' },
  },
  'saffron-dunes-midnight-clay': {
    name: 'Midnight Clay',
    theme: 'saffron-dunes',
    colours: { ground: '#281f24', surface: '#3b2c34', text: '#faede0', muted: '#d7c5c6', accent: '#e7b27d', accent2: '#cba8bd' },
  },
  'saffron-dunes-ochre-canyon': {
    name: 'Ochre Canyon',
    theme: 'saffron-dunes',
    colours: { ground: '#eee0c0', surface: '#f9f2df', text: '#443422', muted: '#6e5b44', accent: '#8a5829', accent2: '#b2624c' },
  },
  'ma-rice-paper': {
    name: 'Rice Paper',
    theme: 'ma',
    colours: { ground: '#f8f2e9', surface: '#ffffff', text: '#29232b', muted: '#615d63', accent: '#b22e2e', accent2: '#2f6082' },
  },
  'ma-sumi-ink': {
    name: 'Sumi Ink',
    theme: 'ma',
    colours: { ground: '#141a1a', surface: '#26302f', text: '#f7f3eb', muted: '#c9cfcb', accent: '#c2d6cb', accent2: '#ee9882' },
  },
  'ma-indigo-wash': {
    name: 'Indigo Wash',
    theme: 'ma',
    colours: { ground: '#e8edf1', surface: '#ffffff', text: '#253947', muted: '#55646f', accent: '#42657b', accent2: '#b45b4d' },
  },
  'postmarked-love-cream-ledger': {
    name: 'Cream Ledger',
    theme: 'postmarked-love',
    colours: { ground: '#f8e9d4', surface: '#fff9ee', text: '#372e34', muted: '#6b5961', accent: '#a53157', accent2: '#206d89' },
  },
  'postmarked-love-inkbound': {
    name: 'Inkbound',
    theme: 'postmarked-love',
    colours: { ground: '#1f2528', surface: '#343b3e', text: '#f9f2e6', muted: '#cbd1c7', accent: '#e0b88c', accent2: '#b4c2b4' },
  },
  'postmarked-love-faded-blue': {
    name: 'Faded Blue',
    theme: 'postmarked-love',
    colours: { ground: '#e9f0ed', surface: '#ffffff', text: '#273b43', muted: '#536167', accent: '#496875', accent2: '#a16e5a' },
  },
  'happy-accident-bubblegum': {
    name: 'Bubblegum',
    theme: 'happy-accident',
    colours: { ground: '#fff1df', surface: '#ffffff', text: '#242a40', muted: '#595871', accent: '#992375', accent2: '#187e73' },
  },
  'happy-accident-afterparty': {
    name: 'Afterparty',
    theme: 'happy-accident',
    colours: { ground: '#27213f', surface: '#3a3155', text: '#fff3df', muted: '#d7cbe2', accent: '#ffb9d1', accent2: '#f8d270' },
  },
  'happy-accident-confetti-mint': {
    name: 'Confetti Mint',
    theme: 'happy-accident',
    colours: { ground: '#e9f7f0', surface: '#ffffff', text: '#203c39', muted: '#536662', accent: '#256c67', accent2: '#c65b75' },
  },
  'jerusalem-stone-limestone': {
    name: 'Limestone',
    theme: 'jerusalem-stone',
    colours: { ground: '#f4ebd8', surface: '#fff8eb', text: '#2d3547', muted: '#5e6670', accent: '#854a2f', accent2: '#2f6d82' },
  },
  'jerusalem-stone-evening-stone': {
    name: 'Evening Stone',
    theme: 'jerusalem-stone',
    colours: { ground: '#202b31', surface: '#334148', text: '#f5ebdd', muted: '#d0d4cf', accent: '#e8bc81', accent2: '#a4c7ae' },
  },
  'jerusalem-stone-rose-sandstone': {
    name: 'Rose Sandstone',
    theme: 'jerusalem-stone',
    colours: { ground: '#f5e7df', surface: '#fff9f3', text: '#4e3431', muted: '#73564e', accent: '#8d5242', accent2: '#667b6c' },
  },
  'golden-hour-groove-tangerine': {
    name: 'Tangerine',
    theme: 'golden-hour-groove',
    colours: { ground: '#ffeaca', surface: '#fff6de', text: '#46284c', muted: '#6f5472', accent: '#952e58', accent2: '#1f6b73' },
  },
  'golden-hour-groove-disco-night': {
    name: 'Disco Night',
    theme: 'golden-hour-groove',
    colours: { ground: '#24203e', surface: '#373151', text: '#fcf0db', muted: '#d5c9d7', accent: '#ffb968', accent2: '#f397b4' },
  },
  'golden-hour-groove-avocado': {
    name: 'Avocado',
    theme: 'golden-hour-groove',
    colours: { ground: '#e9e7cb', surface: '#f7f4e1', text: '#303f2c', muted: '#5b624e', accent: '#5c6d29', accent2: '#ae613b' },
  },
  'mazal-tov-papercut-jubilant-ivory': {
    name: 'Jubilant Ivory',
    theme: 'mazal-tov-papercut',
    colours: { ground: '#fff2d5', surface: '#ffffff', text: '#27162e', muted: '#62435f', accent: '#a02166', accent2: '#116b60' },
  },
  'mazal-tov-papercut-sapphire-celebration': {
    name: 'Sapphire Celebration',
    theme: 'mazal-tov-papercut',
    colours: { ground: '#f0f4fb', surface: '#ffffff', text: '#142b4b', muted: '#4b5c72', accent: '#174b98', accent2: '#a24723' },
  },
  'mazal-tov-papercut-midnight-chai': {
    name: 'Midnight Chai',
    theme: 'mazal-tov-papercut',
    colours: { ground: '#17132c', surface: '#26203e', text: '#fff4e0', muted: '#ccc3d8', accent: '#efb95f', accent2: '#f191b7' },
  },
  'chuppah-jubilee-festival-linen': {
    name: 'Festival Linen',
    theme: 'chuppah-jubilee',
    colours: { ground: '#fff1d5', surface: '#fffbf3', text: '#34172d', muted: '#704856', accent: '#ad1f60', accent2: '#1c7274' },
  },
  'chuppah-jubilee-pistachio-garden': {
    name: 'Pistachio Garden',
    theme: 'chuppah-jubilee',
    colours: { ground: '#edf6ec', surface: '#fcfffa', text: '#284237', muted: '#53675a', accent: '#356c50', accent2: '#9f4873' },
  },
  'chuppah-jubilee-velvet-canopy': {
    name: 'Velvet Canopy',
    theme: 'chuppah-jubilee',
    colours: { ground: '#20142d', surface: '#332043', text: '#fff2e7', muted: '#d6c7d3', accent: '#f3b66c', accent2: '#f49fc0' },
  },
  'seven-blessings-ivory-jewel': {
    name: 'Ivory Jewel',
    theme: 'seven-blessings',
    colours: { ground: '#fff3de', surface: '#ffffff', text: '#282045', muted: '#605574', accent: '#6b299c', accent2: '#17727c' },
  },
  'seven-blessings-sapphire-ceremony': {
    name: 'Sapphire Ceremony',
    theme: 'seven-blessings',
    colours: { ground: '#101a36', surface: '#1e2d4b', text: '#f8ecdd', muted: '#c5cadd', accent: '#efcb84', accent2: '#a5cad5' },
  },
  'seven-blessings-emerald-royal': {
    name: 'Emerald Royal',
    theme: 'seven-blessings',
    colours: { ground: '#102c29', surface: '#20423c', text: '#faf5df', muted: '#cddcd2', accent: '#ebc56e', accent2: '#f6b6b4' },
  },
  'rimon-fiesta-citrus-turquoise': {
    name: 'Citrus Turquoise',
    theme: 'rimon-fiesta',
    colours: { ground: '#fff0ba', surface: '#ffffff', text: '#172b3d', muted: '#465b61', accent: '#9c1f50', accent2: '#067481' },
  },
  'rimon-fiesta-mosaic-mint': {
    name: 'Mosaic Mint',
    theme: 'rimon-fiesta',
    colours: { ground: '#eaf7f3', surface: '#ffffff', text: '#243943', muted: '#50646b', accent: '#8c315e', accent2: '#176e83' },
  },
  'rimon-fiesta-midnight-medina': {
    name: 'Midnight Medina',
    theme: 'rimon-fiesta',
    colours: { ground: '#132a39', surface: '#20394b', text: '#fff4e2', muted: '#c9d7dd', accent: '#f6bd6a', accent2: '#f18f9f' },
  },
  'klezmer-confetti-festival-peach': {
    name: 'Festival Peach',
    theme: 'klezmer-confetti',
    colours: { ground: '#ffe2be', surface: '#fffbf1', text: '#2c2434', muted: '#615168', accent: '#9d2168', accent2: '#146f82' },
  },
  'klezmer-confetti-klezmer-lime': {
    name: 'Klezmer Lime',
    theme: 'klezmer-confetti',
    colours: { ground: '#f6f9de', surface: '#ffffff', text: '#302f43', muted: '#5c5c70', accent: '#71529b', accent2: '#2e7660' },
  },
  'klezmer-confetti-indigo-dance': {
    name: 'Indigo Dance',
    theme: 'klezmer-confetti',
    colours: { ground: '#1e174b', surface: '#30285f', text: '#fff8e9', muted: '#d3cbe9', accent: '#ffd275', accent2: '#ffa6c7' },
  },
  'firework-finale-sunrise-spark': {
    name: 'Sunrise Spark',
    theme: 'firework-finale',
    colours: { ground: '#fff4ea', surface: '#ffffff', text: '#352e50', muted: '#625c77', accent: '#9c3971', accent2: '#1a7276' },
  },
  'firework-finale-cobalt-night': {
    name: 'Cobalt Night',
    theme: 'firework-finale',
    colours: { ground: '#121e55', surface: '#1f2f67', text: '#fff8ea', muted: '#dfe4f6', accent: '#f6ca68', accent2: '#71e3d8' },
  },
  'firework-finale-plum-sky': {
    name: 'Plum Sky',
    theme: 'firework-finale',
    colours: { ground: '#2c123c', surface: '#462454', text: '#fff7f0', muted: '#e1cedf', accent: '#f8cb75', accent2: '#fda0c9' },
  },
  'poolside-vows-aqua-daylight': {
    name: 'Aqua Daylight',
    theme: 'poolside-vows',
    colours: { ground: '#e7f9f5', surface: '#ffffff', text: '#10374b', muted: '#3d5d65', accent: '#08708d', accent2: '#a94328' },
  },
  'poolside-vows-coral-cabana': {
    name: 'Coral Cabana',
    theme: 'poolside-vows',
    colours: { ground: '#fff2e8', surface: '#ffffff', text: '#3d3441', muted: '#6c5863', accent: '#b13f5b', accent2: '#167c85' },
  },
  'poolside-vows-blue-hour-pool': {
    name: 'Blue Hour Pool',
    theme: 'poolside-vows',
    colours: { ground: '#0d3248', surface: '#18465c', text: '#f5f8f1', muted: '#c3d9e3', accent: '#f8ce7b', accent2: '#7ddbcb' },
  },
  'confetti-couture-blush-balloon': {
    name: 'Blush Balloon',
    theme: 'confetti-couture',
    colours: { ground: '#ffe5de', surface: '#fff8ed', text: '#301930', muted: '#6a465c', accent: '#9d205f', accent2: '#146e78' },
  },
  'confetti-couture-citrus-couture': {
    name: 'Citrus Couture',
    theme: 'confetti-couture',
    colours: { ground: '#faf8e7', surface: '#ffffff', text: '#353246', muted: '#626073', accent: '#8945a4', accent2: '#537037' },
  },
  'confetti-couture-cherry-velvet': {
    name: 'Cherry Velvet',
    theme: 'confetti-couture',
    colours: { ground: '#2b1028', surface: '#422139', text: '#fff4f5', muted: '#e5c9d9', accent: '#ffb9d0', accent2: '#ffdb88' },
  },
  'gala-glow-pearl-ballroom': {
    name: 'Pearl Ballroom',
    theme: 'gala-glow',
    colours: { ground: '#f7f4ee', surface: '#ffffff', text: '#302c39', muted: '#625f6d', accent: '#775378', accent2: '#956c39' },
  },
  'gala-glow-chandelier-rose': {
    name: 'Chandelier Rose',
    theme: 'gala-glow',
    colours: { ground: '#fff2ee', surface: '#ffffff', text: '#382d34', muted: '#6d5a65', accent: '#9d3d59', accent2: '#88643e' },
  },
  'gala-glow-midnight-ballroom': {
    name: 'Midnight Ballroom',
    theme: 'gala-glow',
    colours: { ground: '#17213a', surface: '#25324a', text: '#fff6e7', muted: '#d7ccbb', accent: '#f0c679', accent2: '#eba4ae' },
  },
  'neon-afterglow-electric-paper': {
    name: 'Electric Paper',
    theme: 'neon-afterglow',
    colours: { ground: '#f7f7fc', surface: '#ffffff', text: '#252741', muted: '#5e617d', accent: '#5342b0', accent2: '#006f71' },
  },
  'neon-afterglow-sherbet-pulse': {
    name: 'Sherbet Pulse',
    theme: 'neon-afterglow',
    colours: { ground: '#fff6e9', surface: '#ffffff', text: '#392c43', muted: '#695a74', accent: '#a63e88', accent2: '#1f7184' },
  },
  'neon-afterglow-ultraviolet-club': {
    name: 'Ultraviolet Club',
    theme: 'neon-afterglow',
    colours: { ground: '#161029', surface: '#272039', text: '#fcf6ff', muted: '#d3c6e1', accent: '#b8fb72', accent2: '#fb89d9' },
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
