export type RsvpStatus = 'pending' | 'attending' | 'declined'
export type Language = 'he' | 'en'

/** Hard ceiling on additional guests per invitation. Not a product rule, only abuse protection. */
export const MAX_EXTRA_GUESTS = 20
export const LIMITS = { name: 80, notes: 500, message: 1000 } as const

/** What a guest sees through their personal link. Never contains other guests' data. */
export interface GuestInvitation {
  guestName: string
  language: Language
  guestsAllowed: boolean
  rsvpStatus: RsvpStatus
  extraGuests: string[]
  dietaryNotes: string
  message: string
  respondedAt: string | null
}

export interface RsvpInput {
  rsvpStatus: 'attending' | 'declined'
  extraGuests: string[]
  dietaryNotes: string
  message: string
}

/** Full record as the admin sees it. */
export interface AdminInvitation extends GuestInvitation {
  id: number
  url: string
  revoked: boolean
  sentAt: string | null
  createdAt: string
  updatedAt: string
  /** 0 when not attending, otherwise 1 + extra guests. */
  confirmedCount: number
}

export interface Stats {
  invited: number
  sent: number
  pending: number
  accepted: number
  declined: number
  confirmedExtraGuests: number
  confirmedAttendees: number
  /** Invitees who may still bring guests (pending or attending with guests allowed): the head count is open-ended above the confirmed figure. */
  openEnded: number
  /** Everyone who has not declined, counted once, plus already-named extra guests. */
  expectedIfAllPendingAttend: number
}

export interface ImportRow {
  row: number
  name: string
  guestsAllowed: boolean
  language: Language
  errors: string[]
  warnings: string[]
}

export interface ImportPreview {
  rows: ImportRow[]
  fileErrors: string[]
  totals: { rows: number; valid: number; withGuestsAllowed: number; errors: number; warnings: number }
}

export interface PhotoInfo { hero: string | null; second: string | null }
