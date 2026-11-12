import type { GuestInvitation, Language } from '#shared/types'

/** The RSVP form in the design studio's preview answers locally with this token and never calls the server. */
export const PREVIEW_TOKEN = 'studio-preview'

const NAMES: Record<Language, string> = { he: 'נועה ואורי', en: 'Noa & Ori', ru: 'Ноа и Ори' }

/** A made-up guest who may bring one more, shown only inside the studio. */
export const sampleGuest = (lang: Language): GuestInvitation => ({
  guestName: NAMES[lang], language: lang, guestsAllowed: true, guestLimit: 1,
  rsvpStatus: 'pending', extraGuests: [], dietaryNotes: '', message: '', respondedAt: null,
})
