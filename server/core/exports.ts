import type { AdminInvitation } from '../../shared/types'
import { toCsv } from './csv'

const yesNo = (v: boolean) => (v ? 'yes' : 'no')

/** One row per invitation: for keeping the links and tracking what was sent. */
export function invitationsCsv(invitations: AdminInvitation[]): string {
  return toCsv(
    ['Guest name', 'Invitation URL', 'Guests allowed', 'Language', 'Sent', 'Opened', 'RSVP status', 'Confirmed attendees', 'Last response'],
    invitations.map(i => [i.guestName, i.revoked ? '(link revoked)' : i.url, i.guestsAllowed ? `up to ${i.guestLimit}` : 'no', i.language, yesNo(!!i.sentAt), yesNo(!!i.firstOpenedAt), i.rsvpStatus, i.confirmedCount, i.respondedAt ?? '']),
  )
}

/** One row per confirmed attendee. Additional guests get their own rows and name who invited them. */
export function plannerCsv(invitations: AdminInvitation[]): string {
  const rows: (string | number)[][] = []
  for (const i of invitations) {
    if (i.rsvpStatus !== 'attending') continue
    rows.push([i.guestName, 'Invited guest', '', i.dietaryNotes, i.respondedAt ?? ''])
    for (const name of i.extraGuests) rows.push([name, 'Additional guest', i.guestName, '', i.respondedAt ?? ''])
  }
  return toCsv(['Name', 'Type', 'Guest of', 'Dietary and accessibility notes', 'Confirmed at'], rows)
}

export function templateCsv(): string {
  return toCsv(['name', 'plus_one_allowed', 'language'], [
    ['דניאל כהן', 'true', 'he'],
    ['Alex Levi', 'false', 'en'],
    ['נועה ישראלי', '1', ''],
  ])
}
