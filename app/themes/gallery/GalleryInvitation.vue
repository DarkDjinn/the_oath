<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import { contrast } from '#shared/design/colour'
import { fontsInUse, letteringVars } from '#shared/design/fonts'
import { designTokens, tokenVars } from '#shared/design/tokens'
import { joinNames, LOCALES, type GuestInvitation } from '#shared/types'
import { fontLinks } from '~/utils/fontFiles'
import { celebrationArt, isCelebration } from '../celebration/art'
import { backdrop, divider, emblem } from './art'
import './gallery.css'
import '../celebration/celebration.css'

/**
 * The gallery styles and the celebration collection: twenty invitations that share one page
 * and differ in their art (gallery/art.ts, celebration/art.ts) and their look (gallery.css,
 * celebration.css).
 *
 * The page is always hero → welcome → schedule → place → RSVP. Each style (the campaign's
 * theme id, e.g. `jaffa-sun`) brings its own drawings (art.ts) and its own look
 * (gallery.css, under `.gal-<style>`); each of the style's options becomes a class
 * `g-<option>-<choice>` that the look reads. Every colour and typeface is the couple's.
 * With an `invitation` (and its `token`) the page is personal and carries the RSVP form;
 * without one it is the campaign's public, read-only page.
 */
const props = defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
const emit = defineEmits<{ update: [GuestInvitation] }>()

const { lang, m, dir, others, setLang } = useI18n()
const look = computed(() => props.campaign.design.theme)
const content = computed(() => props.campaign.content)
const options = computed(() => props.campaign.design.options)

/** Every colour and typeface comes from the couple's design. */
const tokens = computed(() => designTokens(props.campaign.design))
/** Text set on a filled button: whichever of the page's own text and background reads better on that fill. */
const onFill = (fill: string) => contrast(tokens.value.text, fill) >= contrast(tokens.value.ground, fill) ? tokens.value.text : tokens.value.ground
const vars = computed(() => ({
  ...tokenVars(tokens.value),
  ...letteringVars(props.campaign.design.lettering),
  '--g-on-accent': onFill(tokens.value.accent),
  '--g-on-accent2': onFill(tokens.value.accent2),
}))
/** `g-cta-pill`, `g-frame-double`, … one class per option. */
const optionClasses = computed(() => Object.entries(options.value).map(([k, v]) => `g-${k}-${v}`))

const art = computed(() => isCelebration(look.value)
  ? celebrationArt(look.value, options.value, tokens.value.scheme)
  : { emblem: emblem(look.value, options.value), divider: divider(look.value, options.value), backdrop: backdrop(look.value, options.value) })

const names = computed(() => joinNames(content.value.couple[lang.value], lang.value))
const copy = computed(() => content.value.copy[lang.value])
/** A name of the couple's own, shown large; their names then sit beneath it. */
const headline = computed(() => copy.value.headline || '')
/** Beneath Hebrew or Russian names, the same names in English when the couple gave them. */
const latinNames = computed(() => {
  if (lang.value === 'en') return ''
  const en = content.value.couple.en
  return en?.first && en?.second ? joinNames(en, 'en') : ''
})
const subline = computed(() => headline.value ? names.value : latinNames.value)
const venue = computed(() => content.value.venue[lang.value])
const dressCode = computed(() => content.value.dressCode[lang.value])
const notes = computed(() => content.value.notes[lang.value])

const locale = computed(() => LOCALES[lang.value])
const at = (iso: string) => new Date(`${iso}T12:00:00Z`)
const numericDate = computed(() => content.value.date.split('-').reverse().join('.'))
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

/** The personal line starts with the guest's name; the couple's own wording, if any, follows it. */
const inviteRest = computed(() => {
  if (!props.invitation) return copy.value.invite || m.value.hero.invite
  return copy.value.invite ? `, ${copy.value.invite}` : m.value.hero.invitePersonal.replace('{name}', '')
})
const closed = computed(() => props.campaign.rsvpClosed || props.campaign.status !== 'live')

/** Photos show unless the style has a photo option set to "No photos". */
const photoMode = computed(() => options.value['photo-mode'] ?? options.value['photo-layout'])
const showPhotos = computed(() => photoMode.value !== 'none')
const hero = computed(() => showPhotos.value ? props.campaign.photos.hero : null)
/** Layouts that set both photos side by side, where the main photo goes. */
const paired = computed(() => ['diptych', 'side', 'polaroids', 'split', 'filmstrip'].includes(photoMode.value ?? '') && !!hero.value && !!props.campaign.photos.second)
const second = computed(() => showPhotos.value ? props.campaign.photos.second : null)
const secondLater = computed(() => paired.value ? null : second.value)
/** Chuppah Jubilee's "below the welcome" moves the main photo out of the opening, so the canopy stands alone. */
const heroLater = computed(() => look.value === 'chuppah-jubilee' && photoMode.value === 'below')
const srcset = (slot: 'hero' | 'second', version: string) => [480, 800, 1200, 1800].map(w => `/photos/${props.campaign.id}/${slot}?w=${w}&v=${version} ${w}w`).join(', ')

useHead(() => ({
  // The colours sit on <html> too, so the ground reaches the edges of the window.
  htmlAttrs: { lang: lang.value, dir: dir.value, style: Object.entries(vars.value).map(([k, v]) => `${k}:${v}`).join(';') },
  title: headline.value || names.value,
  link: fontLinks(fontsInUse(props.campaign.design.lettering)),
}))
</script>

<template>
  <div class="gal" :class="[`gal-${look}`, `gal-${lang}`, `gal-${tokens.scheme}`, optionClasses, { 'has-photo': hero, 'gal-cel': isCelebration(look) }]" :style="vars">
    <div v-if="art.backdrop" class="g-backdrop" aria-hidden="true" v-html="art.backdrop" />

    <div class="g-sheet">
      <header class="g-hero">
        <nav v-if="others.length" class="g-lang" aria-label="Language">
          <button v-for="o in others" :key="o.id" type="button" class="text-button" :lang="o.id" :dir="o.dir" @click="setLang(o.id)">{{ o.name }}</button>
        </nav>

        <div v-if="art.emblem" class="g-emblem" aria-hidden="true" v-html="art.emblem" />
        <p v-if="look === 'herbarium' && content.date" class="g-specimen" aria-hidden="true">No. {{ content.date.slice(5).split('-').reverse().join('·') }}</p>

        <figure v-if="hero && !heroLater" class="g-photo g-photo-hero" :class="{ 'is-pair': paired }">
          <img :srcset="srcset('hero', hero)" :src="`/photos/${campaign.id}/hero?w=800&v=${hero}`" sizes="(min-width: 34rem) 28rem, 90vw" alt="" decoding="async" fetchpriority="high">
          <img v-if="paired && second" :srcset="srcset('second', second)" :src="`/photos/${campaign.id}/second?w=800&v=${second}`" sizes="(min-width: 34rem) 14rem, 45vw" alt="" decoding="async">
        </figure>

        <div class="g-col g-lockup">
          <p class="g-kicker"><bdi v-if="invitation">{{ invitation.guestName }}</bdi>{{ inviteRest }}</p>
          <h1 class="g-names" :class="{ 'is-names': !headline }">{{ headline || names }}</h1>
          <p v-if="subline" class="g-subline"><bdi :dir="subline === latinNames || lang === 'en' ? 'ltr' : undefined">{{ subline }}</bdi></p>
          <p v-if="content.date" class="g-date">
            <span class="g-weekday">{{ weekday }}</span>
            <span class="g-dot" aria-hidden="true"> · </span>
            <bdi class="g-numeric" dir="ltr">{{ numericDate }}</bdi>
          </p>
          <a v-if="invitation" href="#rsvp" class="g-cta g-cta-hero">{{ invitation.rsvpStatus === 'pending' ? m.hero.confirm : m.hero.change }}</a>
        </div>
      </header>

      <main>
        <section class="g-col g-welcome" aria-labelledby="g-welcome">
          <div v-if="art.divider" class="g-divider" aria-hidden="true" v-html="art.divider" />
          <h2 id="g-welcome" class="g-title">{{ m.details.welcome }}</h2>
          <p class="g-text">{{ copy.intro || m.details.intro }}</p>
        </section>

        <figure v-if="hero && heroLater" class="g-col g-photo g-photo-hero g-photo-later">
          <img :srcset="srcset('hero', hero)" :src="`/photos/${campaign.id}/hero?w=800&v=${hero}`" sizes="(min-width: 34rem) 28rem, 86vw" alt="" loading="lazy" decoding="async">
        </figure>

        <figure v-if="secondLater" class="g-col g-photo g-photo-second">
          <img :srcset="srcset('second', secondLater)" :src="`/photos/${campaign.id}/second?w=800&v=${secondLater}`" sizes="(min-width: 34rem) 28rem, 86vw" alt="" loading="lazy" decoding="async">
        </figure>

        <section class="g-col g-details" aria-labelledby="g-schedule">
          <div class="g-card" :class="{ 'is-single': times.length < 2 }">
            <h2 id="g-schedule" class="g-label">{{ m.details.schedule }}</h2>
            <p v-if="longDate" class="g-card-date">{{ longDate }}</p>
            <dl v-if="times.length" class="g-times">
              <div v-for="t in times" :key="t.id">
                <dd><bdi dir="ltr">{{ t.value }}</bdi></dd>
                <dt>{{ t.label }}</dt>
              </div>
            </dl>
          </div>

          <div v-if="venue.name || venue.address || content.links.waze || content.links.googleMaps" class="g-place-block">
            <h2 class="g-label g-place">{{ m.details.location }}</h2>
            <address class="g-venue">
              <strong v-if="venue.name">{{ venue.name }}</strong>
              <span v-if="venue.address">{{ venue.address }}</span>
            </address>
          </div>
          <p class="g-nav">
            <a v-if="content.links.googleMaps" :href="content.links.googleMaps" target="_blank" rel="noopener noreferrer">{{ m.details.maps }}</a>
            <a v-if="content.links.waze" :href="content.links.waze" target="_blank" rel="noopener noreferrer">{{ m.details.waze }}</a>
            <a v-if="content.date && campaign.status === 'live'" :href="`/api/calendar/${campaign.slug}.ics`">{{ m.details.calendar }}</a>
          </p>
          <p v-if="dressCode" class="g-text g-note"><strong>{{ m.details.dressCode }}.</strong> {{ dressCode }}</p>
          <p v-if="notes" class="g-text g-note g-note-long">{{ notes }}</p>
        </section>

        <section id="rsvp" class="g-col g-rsvp" aria-labelledby="g-rsvp-title">
          <div v-if="art.divider" class="g-divider" aria-hidden="true" v-html="art.divider" />
          <h2 id="g-rsvp-title" class="g-title">{{ m.rsvp.title }}</h2>
          <RsvpForm
            v-if="invitation && token" :invitation="invitation" :token="token" :rsvp-by="rsvpBy" :closed="closed"
            :ask-dietary="content.rsvp.askDietary" :ask-message="content.rsvp.askMessage" @update="emit('update', $event)"
          />
          <p v-else class="g-text">{{ m.rsvp.onlyByLink }}</p>
        </section>
      </main>

      <footer class="g-footer">
        <p class="g-footer-line">{{ copy.footer || m.hero.love }}</p>
        <p class="g-footer-names">{{ names }}</p>
      </footer>
    </div>
  </div>
</template>
