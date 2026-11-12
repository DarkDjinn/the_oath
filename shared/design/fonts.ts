/**
 * The typefaces a couple may choose from. All are self-hosted (see app/utils/fontFiles.ts),
 * so an invitation never calls a third party, and a guest downloads only the faces in use.
 *
 * `scripts` says which alphabets a face can draw. A role that must show Hebrew only offers
 * faces with Hebrew; anything a face cannot draw falls through to the theme's own stack.
 */
export type Script = 'he' | 'latin' | 'cyrillic'

/** Where a typeface is used on the invitation. */
export const FONT_ROLES = {
  display: { label: 'Names and headings', needs: 'he' },
  latin: { label: 'Names in English', needs: 'latin' },
  body: { label: 'Text', needs: 'he' },
  numeral: { label: 'Dates and times', needs: 'latin' },
} as const satisfies Record<string, { label: string, needs: Script }>
export type FontRole = keyof typeof FONT_ROLES
export type Lettering = Record<FontRole, string>

export interface FontDefinition {
  label: string
  /** The CSS family name the package registers. */
  family: string
  scripts: Script[]
  /** The roles this face suits. A script face is fine for names, never for body text. */
  roles: FontRole[]
  mood: string
}

export const FONTS: Record<string, FontDefinition> = {
  'frank-ruhl': { label: 'Frank Ruhl Libre', family: 'Frank Ruhl Libre Variable', scripts: ['he', 'latin'], roles: ['display', 'latin', 'body', 'numeral'], mood: 'Classic Hebrew serif' },
  'david': { label: 'David Libre', family: 'David Libre', scripts: ['he', 'latin'], roles: ['display', 'body'], mood: 'Bookish and calm' },
  'noto-serif': { label: 'Noto Serif Hebrew', family: 'Noto Serif Hebrew Variable', scripts: ['he', 'latin'], roles: ['display', 'body'], mood: 'Even, modern serif' },
  'bona-nova': { label: 'Bona Nova', family: 'Bona Nova', scripts: ['he', 'latin', 'cyrillic'], roles: ['display', 'latin', 'body', 'numeral'], mood: 'Elegant, a little old-world' },
  'bellefair': { label: 'Bellefair', family: 'Bellefair', scripts: ['he', 'latin'], roles: ['display', 'latin', 'numeral'], mood: 'Slender and refined' },
  'suez': { label: 'Suez One', family: 'Suez One', scripts: ['he', 'latin'], roles: ['display', 'latin'], mood: 'Heavy, confident serif' },
  'heebo': { label: 'Heebo', family: 'Heebo Variable', scripts: ['he', 'latin'], roles: ['display', 'latin', 'body', 'numeral'], mood: 'Clean and modern' },
  'rubik': { label: 'Rubik', family: 'Rubik Variable', scripts: ['he', 'latin', 'cyrillic'], roles: ['display', 'latin', 'body', 'numeral'], mood: 'Soft, rounded corners' },
  'assistant': { label: 'Assistant', family: 'Assistant Variable', scripts: ['he', 'latin'], roles: ['display', 'body', 'numeral'], mood: 'Light and airy' },
  'secular': { label: 'Secular One', family: 'Secular One', scripts: ['he', 'latin'], roles: ['display', 'latin'], mood: 'Bold poster letters' },
  'amatic': { label: 'Amatic SC', family: 'Amatic SC', scripts: ['he', 'latin', 'cyrillic'], roles: ['display', 'latin', 'numeral'], mood: 'Hand-drawn and playful' },
  'playfair': { label: 'Playfair Display', family: 'Playfair Display Variable', scripts: ['latin', 'cyrillic'], roles: ['latin', 'numeral'], mood: 'High-contrast editorial' },
  'cormorant': { label: 'Cormorant Garamond', family: 'Cormorant Garamond Variable', scripts: ['latin', 'cyrillic'], roles: ['latin', 'numeral'], mood: 'Delicate and romantic' },
  'poiret': { label: 'Poiret One', family: 'Poiret One', scripts: ['latin', 'cyrillic'], roles: ['latin', 'numeral'], mood: 'Art deco geometry' },
  'great-vibes': { label: 'Great Vibes', family: 'Great Vibes', scripts: ['latin', 'cyrillic'], roles: ['latin'], mood: 'Flowing script' },
  'unifraktur': { label: 'Unifraktur Cook', family: 'UnifrakturCook', scripts: ['latin'], roles: ['latin'], mood: 'Gothic blackletter' },
  'pirata': { label: 'Pirata One', family: 'Pirata One', scripts: ['latin'], roles: ['latin', 'numeral'], mood: 'Blackletter numerals' },
}

/** What the invitation used before lettering could be chosen; a role left on its default changes nothing. */
export const DEFAULT_LETTERING: Lettering = { display: 'frank-ruhl', latin: 'unifraktur', body: 'david', numeral: 'pirata' }

export const fontsForRole = (role: FontRole) =>
  Object.fromEntries(Object.entries(FONTS).filter(([, f]) => f.roles.includes(role) && f.scripts.includes(FONT_ROLES[role].needs)))

export function normaliseLettering(input: unknown, base: Lettering = DEFAULT_LETTERING): Lettering {
  const raw = (input ?? {}) as Record<string, unknown>
  const out = { ...base }
  for (const role of Object.keys(FONT_ROLES) as FontRole[]) {
    const id = raw[role]
    if (typeof id === 'string' && id in fontsForRole(role)) out[role] = id
  }
  return out
}

/** The stylesheet's own stacks. A chosen face is put in front, so alphabets it lacks still fall through to these. */
const STACKS: Record<FontRole, { variable: string, stack: string }> = {
  display: { variable: '--font-display', stack: '\'Frank Ruhl Libre Variable\', \'Frank Ruhl Libre\', \'Vollkorn Variable\', \'Times New Roman\', serif' },
  latin: { variable: '--font-fraktur', stack: '\'Frank Ruhl Libre Variable\', \'Vollkorn Variable\', serif' },
  body: { variable: '--font-body', stack: '\'David Libre\', \'Vollkorn Variable\', \'Frank Ruhl Libre Variable\', Georgia, serif' },
  numeral: { variable: '--font-numeral', stack: '\'Frank Ruhl Libre Variable\', serif' },
}

/** CSS variables for every role that is not on its default face. */
export function letteringVars(lettering: Lettering): Record<string, string> {
  const vars: Record<string, string> = {}
  for (const role of Object.keys(FONT_ROLES) as FontRole[]) {
    const id = lettering[role]
    if (id !== DEFAULT_LETTERING[role] && FONTS[id]) vars[STACKS[role].variable] = `'${FONTS[id].family}', ${STACKS[role].stack}`
  }
  return vars
}

/** The catalogue ids whose files an invitation with this lettering needs. */
export const fontsInUse = (lettering: Lettering): string[] => [...new Set(Object.values(lettering))]
