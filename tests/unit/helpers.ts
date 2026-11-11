import { openDatabase } from '../../server/core/db'
import { createInvitation, toAdmin, type InvitationRow } from '../../server/core/invitations'
import { deriveToken } from '../../server/core/tokens'

export const SECRET = 'unit-test-secret-unit-test-secret-0123'
export const BASE = 'https://wedding-example.duckdns.org'

export const freshDb = () => openDatabase(':memory:')
export const tokenOf = (row: InvitationRow) => deriveToken(SECRET, row.token_nonce)
export const invite = (db: ReturnType<typeof freshDb>, guestName: string, guestsAllowed = false) =>
  createInvitation(db, SECRET, { guestName, guestsAllowed })
export const admin = (row: InvitationRow) => toAdmin(row, SECRET, BASE)
