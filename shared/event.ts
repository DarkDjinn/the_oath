/**
 * The single place for everything about the event.
 * Replace the placeholders below before sending invitations.
 */
export const event = {
  couple: {
    he: { first: 'אסטריד', second: 'אריק' },
    en: { first: 'Astrid', second: 'Erik' },
  },
  /** Local date and times in Israel. */
  date: '2027-05-20',
  receptionTime: '19:00',
  ceremonyTime: '20:00',
  timezone: 'Asia/Jerusalem',
  venue: {
    he: { name: 'שם המקום', address: 'רחוב לדוגמה 1, עיר' },
    en: { name: 'Venue Name', address: '1 Example Street, City' },
  },
  /** Navigation links. Leave empty to hide. */
  links: {
    googleMaps: 'https://maps.google.com/?q=Venue+Name',
    waze: 'https://waze.com/ul?q=Venue%20Name&navigate=yes',
  },
  /** Optional. Leave empty strings to hide. */
  dressCode: { he: 'לבוש ערב. שחור תמיד מתקבל בברכה.', en: 'Evening attire. Black is always welcome.' },
  notes: { he: '', en: '' },
  /** Ask guests to answer by this date (shown on the invitation). Empty to hide. */
  rsvpBy: '2027-04-20',
} as const

export type EventConfig = typeof event
