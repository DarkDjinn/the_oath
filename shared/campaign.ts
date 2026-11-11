import type { Design } from './themes'
import { LANGUAGES, type Language, type PhotoInfo } from './types'

export type CampaignStatus = 'draft' | 'live' | 'archived'
type PerLanguage<T> = Record<Language, T>

/** Lines a couple may reword. An empty string means "use the standard text". */
export interface CopyOverrides { invite: string, intro: string, footer: string }

/** Everything about one couple's event. Stored as JSON on the campaign. */
export interface CampaignContent {
  couple: PerLanguage<{ first: string, second: string }>
  /** Local date and times, e.g. 2027-05-20 and 19:00. `ceremonyTime` may be empty. */
  date: string
  receptionTime: string
  ceremonyTime: string
  venue: PerLanguage<{ name: string, address: string }>
  links: { googleMaps: string, waze: string }
  dressCode: PerLanguage<string>
  notes: PerLanguage<string>
  /** Reply-by date, or empty. */
  rsvpBy: string
  /** Enabled languages; the first is the default. */
  languages: Language[]
  copy: PerLanguage<CopyOverrides>
  rsvp: {
    /** Replies closed by hand. */
    closed: boolean
    /** Close replies automatically once `rsvpBy` has passed. */
    closeAfterDeadline: boolean
    askDietary: boolean
    askMessage: boolean
    /** How many guests an invitee may bring when allowed, unless their invitation says otherwise. */
    guestLimit: number
  }
}

export type WhatsappTemplates = PerLanguage<string>

/** `{name}` and `{link}` are replaced per invitation. */
export const DEFAULT_WHATSAPP: WhatsappTemplates = {
  he: 'שלום {name} ❤️\nאנחנו מתרגשים להזמין אתכם לחגוג איתנו את החתונה שלנו!\nכל פרטי האירוע ואישור ההגעה נמצאים בקישור האישי שלכם:\n{link}',
  en: 'Hi {name} ❤️\nWe would love for you to celebrate our wedding with us!\nAll the details and your RSVP are at your personal link:\n{link}',
  ru: 'Здравствуйте, {name} ❤️\nМы будем очень рады, если вы отпразднуете нашу свадьбу вместе с нами!\nВсе подробности и подтверждение участия — по вашей личной ссылке:\n{link}',
}

export const EVENT_TIMEZONE = 'Asia/Jerusalem'
export const CONTENT_LIMITS = { name: 40, venue: 80, address: 160, url: 500, line: 160, paragraph: 600 } as const

const perLanguage = <T>(make: (lang: Language) => T) => Object.fromEntries(LANGUAGES.map(l => [l, make(l)])) as PerLanguage<T>

export function defaultContent(names?: Partial<CampaignContent['couple']>): CampaignContent {
  return {
    couple: perLanguage(l => ({ first: '', second: '', ...names?.[l] })),
    date: '',
    receptionTime: '19:00',
    ceremonyTime: '20:00',
    venue: perLanguage(() => ({ name: '', address: '' })),
    links: { googleMaps: '', waze: '' },
    dressCode: perLanguage(() => ''),
    notes: perLanguage(() => ''),
    rsvpBy: '',
    languages: ['he', 'en'],
    copy: perLanguage(() => ({ invite: '', intro: '', footer: '' })),
    rsvp: { closed: false, closeAfterDeadline: false, askDietary: true, askMessage: true, guestLimit: 20 },
  }
}

/** True when guests can no longer answer (closed by hand, or past the reply-by date when that is enforced). */
export function rsvpClosed(content: CampaignContent, today = new Date()): boolean {
  if (content.rsvp.closed) return true
  if (!content.rsvp.closeAfterDeadline || !content.rsvpBy) return false
  const now = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIMEZONE }).format(today) // YYYY-MM-DD in Israel
  return now > content.rsvpBy
}

/** What the public and a guest may know about a campaign. Never includes guests, passwords or settings. */
export interface PublicCampaign {
  id: number
  slug: string
  status: CampaignStatus
  content: CampaignContent
  design: Design
  photos: PhotoInfo
  rsvpClosed: boolean
}

/** A campaign as the admin panel sees it. */
export interface AdminCampaign extends PublicCampaign {
  siteUrl: string
  hasPassword: boolean
  whatsapp: WhatsappTemplates
  createdAt: string
  updatedAt: string
}

export interface SessionInfo {
  authenticated: boolean
  /** 'owner' sees every campaign; 'couple' sees only `campaignId`. */
  role: 'owner' | 'couple' | null
  campaignId: number | null
}
