import { EVENT_TIMEZONE } from '#shared/campaign'
import { joinNames } from '#shared/types'
import { contentOf, getCampaignBySlug } from '../../core/campaigns'

const esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\r?\n/g, '\\n')

/** "Add to calendar": a one-event .ics file for a live campaign. */
export default apiHandler((event) => {
  const slug = (getRouterParam(event, 'slug') ?? '').replace(/\.ics$/, '')
  const row = getCampaignBySlug(useDb(), slug)
  const c = row && contentOf(row)
  if (!row || !c || row.status !== 'live' || !c.date) throw createError({ statusCode: 404, message: 'Not found.' })
  const lang = c.languages[0] ?? 'he'
  const day = c.date.replace(/-/g, '')
  const start = (c.receptionTime || c.ceremonyTime || '19:00').replace(':', '')
  const endHour = String(Math.min(Number(start.slice(0, 2)) + 5, 23)).padStart(2, '0')
  const names = joinNames(c.couple[lang], lang)
  const title = { he: `החתונה של ${names}`, en: `The wedding of ${names}`, ru: `Свадьба: ${names}` }[lang]
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//the-oath//invitation//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
    `UID:campaign-${row.id}@the-oath`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]|\.\d{3}/g, '')}`,
    `DTSTART;TZID=${EVENT_TIMEZONE}:${day}T${start}00`,
    `DTEND;TZID=${EVENT_TIMEZONE}:${day}T${endHour}${start.slice(2)}00`,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc([c.venue[lang].name, c.venue[lang].address].filter(Boolean).join(', '))}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  setResponseHeaders(event, { 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': `attachment; filename="${row.slug}.ics"` })
  return ics
})
