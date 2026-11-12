#!/usr/bin/env node
/**
 * Copies the optional invitation typefaces from node_modules into public/fonts,
 * so each one is a plain stylesheet at a fixed address that only the invitations
 * using it link to. Runs before `dev` and `build`. The list is shared/design/font-files.json.
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const out = join(root, 'public', 'fonts')
const files = JSON.parse(readFileSync(join(root, 'shared', 'design', 'font-files.json'), 'utf8'))

rmSync(out, { recursive: true, force: true })
let count = 0
for (const sheet of new Set(Object.values(files).flat())) {
  const [scope, name, file] = sheet.split('/')
  const from = join(root, 'node_modules', scope, name), to = join(out, `${scope.slice(1)}-${name}`)
  const css = readFileSync(join(from, file), 'utf8')
  mkdirSync(join(to, 'files'), { recursive: true })
  writeFileSync(join(to, file), css)
  // Only the font files this stylesheet names, and only woff2: every browser that can run the site reads it.
  for (const [, font] of css.matchAll(/url\(\.\/files\/([^)]+\.woff2)\)/g)) { cpSync(join(from, 'files', font), join(to, 'files', font)); count++ }
}
console.log(`fonts: ${Object.keys(files).length} typefaces, ${count} files in public/fonts`)
