import type { PublicCampaign } from '#shared/campaign'
import { contrast } from '#shared/design/colour'
import { fontsInUse, letteringVars } from '#shared/design/fonts'
import { designTokens, tokenVars } from '#shared/design/tokens'
import { PRESETS, THEMES } from '#shared/themes'
import { LOCALES, joinNames, type GuestInvitation } from '#shared/types'
import { fontLinks } from '~/utils/fontFiles'
import { artVars, type ArtColour, type Role } from './palette'

export interface StyleArt {
  family: 'poster' | 'festival'
  palette: ArtColour[]
  pairs: [string | number, string | number][]
  hero: string
}

/**
 * Everything the remix styles show, worked out once: the couple's words in the guest's
 * language, the dates, the schedule, the place, the photos and the art's colours.
 * Each style's component only decides how it looks.
 */
export function useInvitationPage(props: { campaign: PublicCampaign, invitation: GuestInvitation | null }, art: StyleArt) {
  const { lang, m, dir, others, setLang } = useI18n()
  const design = computed(() => props.campaign.design)
  const look = computed(() => design.value.theme)
  const options = computed(() => design.value.options)
  const content = computed(() => props.campaign.content)
  const copy = computed(() => content.value.copy[lang.value])
  const tokens = computed(() => designTokens(design.value))

  /** The style's default colours, which the art was drawn in. */
  const drawnIn = computed(() => PRESETS[THEMES[look.value]?.preset ?? '']?.colours ?? design.value.colours)
  const vars = computed(() => {
    const to = design.value.colours as Record<Role, string>
    const t = tokens.value
    return {
      ...tokenVars(t),
      ...letteringVars(design.value.lettering),
      ...artVars(art.palette, art.pairs, drawnIn.value as Record<Role, string>, to),
      '--rx-on-accent': onFill(t.accent),
      '--rx-on-accent2': onFill(t.accent2),
    }
  })
  /** Whichever of the page's ink and paper reads better on a filled colour. */
  function onFill(fill: string) {
    const t = tokens.value
    return contrast(t.text, fill) >= contrast(t.ground, fill) ? t.text : t.ground
  }

  const couple = computed(() => content.value.couple[lang.value])
  const names = computed(() => joinNames(couple.value, lang.value))
  /** The names as two lines, the second carrying its "and". */
  const nameLines = computed(() => {
    const c = couple.value
    if (lang.value === 'he') return [c.first, `ו${c.second}`]
    return [c.first, `${lang.value === 'ru' ? 'и' : '&'} ${c.second}`]
  })
  const headline = computed(() => copy.value.headline || '')
  const latinNames = computed(() => {
    if (lang.value === 'en') return ''
    const en = content.value.couple.en
    return en?.first && en?.second ? joinNames(en, 'en') : ''
  })
  /** The line under the names: the names themselves under a headline, otherwise the English names. */
  const subline = computed(() => headline.value ? names.value : latinNames.value)
  const sublineLtr = computed(() => subline.value === latinNames.value || lang.value === 'en')

  const inviteLine = computed(() => {
    if (!props.invitation) return copy.value.invite || m.value.hero.invite
    return copy.value.invite ? `, ${copy.value.invite}` : m.value.hero.invitePersonal.replace('{name}', '')
  })

  const locale = computed(() => LOCALES[lang.value])
  const at = (iso: string) => new Date(`${iso}T12:00:00Z`)
  const dateParts = computed(() => content.value.date ? content.value.date.split('-').reverse() : [])
  const spacedDate = computed(() => dateParts.value.join(' · '))
  const numericDate = computed(() => dateParts.value.join('.'))
  const weekday = computed(() => content.value.date
    ? new Intl.DateTimeFormat(locale.value, { weekday: 'long', timeZone: 'UTC' }).format(at(content.value.date))
    : '')
  const longDate = computed(() => content.value.date
    ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at(content.value.date))
    : '')
  const rsvpBy = computed(() => content.value.rsvpBy
    ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(at(content.value.rsvpBy))
    : '')
  const times = computed(() => [
    { id: 'reception', label: m.value.details.reception, value: content.value.receptionTime },
    { id: 'ceremony', label: m.value.details.ceremony, value: content.value.ceremonyTime },
  ].filter(t => t.value))

  const venue = computed(() => content.value.venue[lang.value])
  const links = computed(() => content.value.links)
  const hasPlace = computed(() => !!(venue.value.name || venue.value.address || links.value.waze || links.value.googleMaps))
  const dressCode = computed(() => content.value.dressCode[lang.value])
  const notes = computed(() => content.value.notes[lang.value])
  const closed = computed(() => props.campaign.rsvpClosed || props.campaign.status !== 'live')

  /** The style's photo option (`photo-mode` or `photo-layout`); styles without one show photos plainly. */
  const photoMode = computed(() => options.value['photo-mode'] ?? options.value['photo-layout'] ?? 'inset')
  const showPhotos = computed(() => photoMode.value !== 'none')
  const hero = computed(() => showPhotos.value ? props.campaign.photos.hero : null)
  const second = computed(() => showPhotos.value ? props.campaign.photos.second : null)
  const paired = computed(() => ['pair', 'diptych', 'polaroids', 'filmstrip', 'side', 'split'].includes(photoMode.value) && !!hero.value && !!second.value)
  const photoSrc = (slot: 'hero' | 'second', version: string, w = 800) => `/photos/${props.campaign.id}/${slot}?w=${w}&v=${version}`
  const srcset = (slot: 'hero' | 'second', version: string) => [480, 800, 1200].map(w => `${photoSrc(slot, version, w)} ${w}w`).join(', ')

  /** `rx-o-cta-pill`, `rx-o-frame-double`, … one class per option. */
  const optionClasses = computed(() => Object.entries(options.value).map(([k, v]) => `rx-o-${k}-${v}`))

  useHead(() => ({
    htmlAttrs: { lang: lang.value, dir: dir.value, class: 'rx-html', style: `--rx-outside:${tokens.value.scheme === 'dark' ? '#0c0d14' : '#1c1d29'}` },
    title: headline.value || names.value,
    link: fontLinks(fontsInUse(design.value.lettering)),
  }))

  return {
    lang, m, dir, others, setLang, look, options, content, copy, tokens, vars,
    names, nameLines, headline, subline, sublineLtr, latinNames, inviteLine,
    spacedDate, numericDate, weekday, longDate, rsvpBy, times,
    venue, links, hasPlace, dressCode, notes, closed,
    photoMode, hero, second, paired, photoSrc, srcset, optionClasses,
  }
}
