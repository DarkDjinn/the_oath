#!/usr/bin/env node
// Prints the ADMIN_PASSWORD_HASH line for a password.
//   npm run hash-password            (prompts, input hidden)
//   npm run hash-password -- 'pass'  (from an argument; ends up in shell history)
// The format matches server/core/auth.ts: scrypt:<salt>:<hash>, base64url.
import { randomBytes, scryptSync } from 'node:crypto'
import { createInterface } from 'node:readline'

function hash(password) {
  const salt = randomBytes(16)
  return `scrypt:${salt.toString('base64url')}:${scryptSync(password, salt, 64).toString('base64url')}`
}

async function prompt() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
  rl._writeToOutput = text => { if (text.includes('Password')) process.stdout.write(text) } // hide typing
  const answer = await new Promise(resolve => rl.question('Password: ', resolve))
  rl.close()
  process.stdout.write('\n')
  return answer
}

const password = process.argv[2] ?? await prompt()
if (!password || password.length < 10) {
  console.error('Choose a password of at least 10 characters.')
  process.exit(1)
}
console.log(`ADMIN_PASSWORD_HASH=${hash(password)}`)
