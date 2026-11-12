import files from '#shared/design/font-files.json'

/**
 * Stylesheet addresses for the faces in shared/design/fonts.ts that are not part of the
 * main stylesheet. `scripts/fonts.mjs` copies each into public/fonts before a build, so
 * it has one fixed address and is linked only by invitations that use it (and by the
 * design studio, which shows every face).
 * Faces missing from the list (Frank Ruhl, David, Heebo, Unifraktur, Pirata) are always loaded.
 */
const address = (sheet: string) => {
  const [scope, name, file] = sheet.split('/')
  return `/fonts/${scope!.slice(1)}-${name}/${file}`
}

/** `<link>` entries for `useHead`, one per stylesheet the given faces need. */
export const fontLinks = (ids: string[]) =>
  ids.flatMap(id => (files as Record<string, string[]>)[id] ?? []).map(sheet => ({ key: `font-${sheet}`, rel: 'stylesheet' as const, href: address(sheet) }))
