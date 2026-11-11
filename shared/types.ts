export type RsvpStatus = 'pending' | 'attending' | 'declined'
export const LANGUAGES = ['he', 'en', 'ru'] as const
export type Language = typeof LANGUAGES[number]
export const LANGUAGE_NAMES: Record<Language, string> = { he: 'Hebrew', en: 'English', ru: 'Russian' }
export const isLanguage = (value: unknown): value is Language => (LANGUAGES as readonly unknown[]).includes(value)
/** BCP 47 locale for dates, and text direction, per language. */
export const LOCALES: Record<Language, string> = { he: 'he-IL', en: 'en-GB', ru: 'ru-RU' }
export const directionOf = (lang: Language): 'rtl' | 'ltr' => (lang === 'he' ? 'rtl' : 'ltr')
/** "A and B" as each language writes it. Hebrew joins the vav to the second name. */
export function joinNames(couple: { first: string, second: string }, lang: Language): string {
  if (lang === 'he') return `${couple.first} ו${couple.second}`
  return `${couple.first} ${lang === 'ru' ? 'и' : '&'} ${couple.second}`
}

/** Hard ceiling on additional guests per invitation. Not a product rule, only abuse protection. */
export const MAX_EXTRA_GUESTS = 20
export const LIMITS = { name: 80, notes: 500, message: 1000 } as const

/** What a guest sees through their personal link. Never contains other guests' data. */
export interface GuestInvitation {
  guestName: string
  language: Language
  guestsAllowed: boolean
  /** How many guests this invitee may bring: 0 when not allowed. */
  guestLimit: number
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
  /** The invitee's own limit, or null to follow the campaign's default. */
  ownGuestLimit: number | null
  /** International form, e.g. +972541234567, or empty. Never shown to guests. */
  phone: string
  /** Why the last automatic send failed, or empty. */
  sendError: string
  /** When the personal link was first opened, if ever. */
  firstOpenedAt: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
  /** 0 when not attending, otherwise 1 + extra guests. */
  confirmedCount: number
}

export interface Stats {
  invited: number
  sent: number
  opened: number
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
  phone: string
  /** Set when the file gives a number instead of true/false. */
  guestLimit: number | null
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

/** One line of an invitation's history, newest first in the admin. */
export interface InvitationEvent {
  at: string
  kind: 'created' | 'opened' | 'answered' | 'edited' | 'sent' | 'send_failed' | 'unsent' | 'link_replaced' | 'link_revoked' | 'link_restored'
  detail: string
}

/** Whether a WhatsApp account is linked for sending. */
export interface LinkStatus {
  state: 'unlinked' | 'pairing' | 'connecting' | 'linked'
  /** While pairing: a QR code image (data URL) to scan with the phone. */
  qr?: string
  /** Once linked: the account's number, digits only. */
  number?: string
}

export interface SendProgress {
  state: 'idle' | 'running' | 'done' | 'stopped'
  sender: 'own' | 'platform' | null
  total: number
  sent: number
  failed: number
  /** Why it stopped early, if it did. */
  reason: string
  /** When the next message goes out, while running. */
  nextAt: string | null
}
