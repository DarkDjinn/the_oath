<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import { directionOf, joinNames, LANGUAGES, LOCALES, type GuestInvitation, type Language } from '#shared/types'
import { fontsInUse, letteringVars } from '#shared/design/fonts'
import { designTokens, tokenVars } from '#shared/design/tokens'
import { fontLinks } from '~/utils/fontFiles'
import { backdropStyle, type Backdrop } from '~/utils/backdrop'
import { braidArt, gateArt, heartArt, moonRingArt, phasesArt, railArt, roseRuleArt, sealArt, sideVineArt, sprayArt, wreathArt } from '~/utils/ornament'

/**
 * Nocturne: the gothic night-garden invitation.
 * With an `invitation` (and its `token`) it is personal and carries the RSVP form;
 * without one it is the campaign's public, read-only page.
 */
const props = defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
const emit = defineEmits<{ update: [GuestInvitation] }>()

const { lang, m, dir, others, setLang } = useI18n()
const content = computed(() => props.campaign.content)
const options = computed(() => props.campaign.design.options)
const photos = computed(() => props.campaign.photos)

/** Every colour comes from the couple's design; the stylesheet and the SVG art only ever read these. */
const tokens = computed(() => designTokens(props.campaign.design))
const vars = computed(() => ({ ...tokenVars(tokens.value), ...letteringVars(props.campaign.design.lettering) }))
const emblem = computed(() => ({ heart: heartArt, wreath: wreathArt, moon: moonRingArt })[options.value.emblem ?? 'heart'] ?? heartArt)
const hasGate = computed(() => options.value.gate !== 'plain')
const backdrop = computed(() => backdropStyle((options.value.backdrop ?? 'stars') as Backdrop, tokens.value))

const couple = computed(() => content.value.couple[lang.value])
const names = computed(() => joinNames(couple.value, lang.value))
/**
 * The names once more, in a second language, under the main ones: English under Hebrew or Russian,
 * Hebrew under English. Shown only when that language's names were filled in.
 */
const second = computed(() => {
  const order: Language[] = [lang.value === 'en' ? 'he' : 'en', ...LANGUAGES]
  const id = order.find(l => l !== lang.value && content.value.couple[l].first && content.value.couple[l].second)
  return id ? { id, dir: directionOf(id), names: joinNames(content.value.couple[id], id) } : null
})
const venue = computed(() => content.value.venue[lang.value])
const dressCode = computed(() => content.value.dressCode[lang.value])
const notes = computed(() => content.value.notes[lang.value])
const copy = computed(() => content.value.copy[lang.value])

const locale = computed(() => LOCALES[lang.value])
const at = (iso: string) => new Date(`${iso}T12:00:00Z`)
const longDate = computed(() => content.value.date
  ? new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at(content.value.date))
  : '')
const numericDate = computed(() => content.value.date.split('-').reverse().join(' · '))
const rsvpBy = computed(() => content.value.rsvpBy
  ? new Intl.DateTimeFormat(locale.value, { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(at(content.value.rsvpBy))
  : '')
const times = computed(() => [
  { label: m.value.details.reception, value: content.value.receptionTime },
  { label: m.value.details.ceremony, value: content.value.ceremonyTime },
].filter(t => t.value))

/** The personal line starts with the guest's name; the couple's own wording, if any, follows it. */
const inviteRest = computed(() => {
  if (!props.invitation) return copy.value.invite || m.value.hero.invite
  return copy.value.invite ? `, ${copy.value.invite}` : m.value.hero.invitePersonal.replace('{name}', '')
})
const closed = computed(() => props.campaign.rsvpClosed || props.campaign.status !== 'live')

const srcset = (slot: 'hero' | 'second', version: string) => [480, 800, 1200, 1800].map(w => `/photos/${props.campaign.id}/${slot}?w=${w}&v=${version} ${w}w`).join(', ')

useHead(() => ({
  // The colours sit on <html> too, so the ground reaches the edges of the window.
  htmlAttrs: { lang: lang.value, dir: dir.value, style: Object.entries(vars.value).map(([k, v]) => `${k}:${v}`).join(';') },
  title: names.value,
  // Only the typefaces this couple chose are fetched.
  link: fontLinks(fontsInUse(props.campaign.design.lettering)),
}))
</script>

<template>
  <div class="inv" :class="`inv-${lang}`" :style="[vars, backdrop]">
    <header class="hero orn-arrive">
      <nav v-if="others.length" class="hero-lang" aria-label="Language">
        <button v-for="o in others" :key="o.id" type="button" class="text-button" :lang="o.id" :dir="o.dir" @click="setLang(o.id)">{{ o.name }}</button>
      </nav>

      <OrnamentArt :art="phasesArt" class="hero-phases" />
      <OrnamentArt :art="sideVineArt" class="hero-vine hero-vine-start" />
      <OrnamentArt :art="sideVineArt" class="hero-vine hero-vine-end" />

      <div class="hero-body inv-col">
        <OrnamentArt :art="emblem" class="hero-heart" />
        <p class="hero-invite"><bdi v-if="invitation">{{ invitation.guestName }}</bdi>{{ inviteRest }}</p>
        <h1 class="hero-names">
          <span>{{ couple.first }}</span>
          <!-- Hebrew joins "and" to the second name; a lone vav would read as a stray mark. -->
          <span v-if="lang !== 'he'" class="hero-and">{{ m.hero.and }}</span>
          <span>{{ lang === 'he' ? `ו${couple.second}` : couple.second }}</span>
        </h1>
        <p v-if="second" class="hero-other" :lang="second.id" :dir="second.dir">{{ second.names }}</p>
        <p v-if="content.date" class="hero-date numeral">{{ numericDate }}</p>
      </div>

      <!-- The gate shows the answer: its rose is a bud until the guest says yes. -->
      <div v-if="hasGate" class="gate" :class="`gate-${invitation?.rsvpStatus ?? 'open'}`">
        <OrnamentArt :art="gateArt" class="gate-art" />
        <a v-if="invitation" href="#rsvp" class="plate gate-plate">{{ invitation.rsvpStatus === 'pending' ? m.hero.rsvp : m.hero.change }}</a>
      </div>
      <div v-else class="gateless">
        <a v-if="invitation" href="#rsvp" class="plate">{{ invitation.rsvpStatus === 'pending' ? m.hero.rsvp : m.hero.change }}</a>
        <OrnamentArt :art="railArt" class="gateless-rail" />
      </div>
    </header>

    <main>
      <figure v-if="photos.hero" class="photo-arch inv-col">
        <svg width="0" height="0" aria-hidden="true" focusable="false"><clipPath id="arch-clip" clipPathUnits="objectBoundingBox"><path d="M0 1V0.375Q0 0.125 0.5 0Q1 0.125 1 0.375V1Z" /></clipPath></svg>
        <img :srcset="srcset('hero', photos.hero)" :src="`/photos/${campaign.id}/hero?w=800&v=${photos.hero}`" sizes="(min-width: 34rem) 26rem, 80vw" width="900" height="1200" alt="" decoding="async">
        <svg class="orn photo-arch-frame" viewBox="0 0 300 400" preserveAspectRatio="none" aria-hidden="true"><path class="o-line" stroke-width="1.5" vector-effect="non-scaling-stroke" d="M1 400V150Q1 50 150 1Q299 50 299 150V400" /></svg>
      </figure>

      <section class="details inv-col" aria-labelledby="details-title">
        <OrnamentArt :art="sprayArt" class="spray spray-start" />
        <OrnamentArt :art="sprayArt" class="spray spray-end" />
        <OrnamentArt :art="braidArt" class="rule" />
        <h2 id="details-title">{{ m.details.title }}</h2>
        <p class="details-intro">{{ copy.intro || m.details.intro }}</p>

        <p v-if="longDate" class="details-date">{{ longDate }}</p>
        <template v-if="times.length">
          <OrnamentArt :art="railArt" class="details-rail" />
          <dl class="details-times" :class="{ 'is-single': times.length === 1 }">
            <div v-for="t in times" :key="t.label"><dt>{{ t.label }}</dt><dd>{{ t.value }}</dd></div>
          </dl>
        </template>

        <address v-if="venue.name || venue.address" class="details-venue">
          <strong v-if="venue.name">{{ venue.name }}</strong>
          <span v-if="venue.address">{{ venue.address }}</span>
        </address>
        <p class="details-links">
          <a v-if="content.links.waze" class="text-button" :href="content.links.waze" target="_blank" rel="noopener noreferrer">{{ m.details.waze }}</a>
          <a v-if="content.links.googleMaps" class="text-button" :href="content.links.googleMaps" target="_blank" rel="noopener noreferrer">{{ m.details.maps }}</a>
          <a v-if="content.date && campaign.status === 'live'" class="text-button" :href="`/api/calendar/${campaign.slug}.ics`">{{ m.details.calendar }}</a>
        </p>

        <p v-if="dressCode" class="details-note"><strong>{{ m.details.dressCode }}.</strong> {{ dressCode }}</p>
        <p v-if="notes" class="details-note details-note-long">{{ notes }}</p>
      </section>

      <figure v-if="photos.second" class="photo-frame inv-col">
        <img :srcset="srcset('second', photos.second)" :src="`/photos/${campaign.id}/second?w=800&v=${photos.second}`" sizes="(min-width: 34rem) 30rem, 90vw" width="1200" height="900" alt="" loading="lazy" decoding="async">
      </figure>

      <section id="rsvp" class="rsvp inv-col" aria-labelledby="rsvp-title">
        <OrnamentArt :art="sprayArt" class="spray spray-start" />
        <OrnamentArt :art="sprayArt" class="spray spray-end" />
        <OrnamentArt :art="roseRuleArt" class="rule" />
        <h2 id="rsvp-title">{{ m.rsvp.title }}</h2>
        <RsvpForm
          v-if="invitation && token" :invitation="invitation" :token="token" :rsvp-by="rsvpBy" :closed="closed"
          :ask-dietary="content.rsvp.askDietary" :ask-message="content.rsvp.askMessage" @update="emit('update', $event)"
        />
        <p v-else class="rsvp-note">{{ m.rsvp.onlyByLink }}</p>
      </section>
    </main>

    <footer class="inv-footer">
      <OrnamentArt :art="sealArt" class="inv-footer-seal" />
      <p class="inv-footer-line">{{ copy.footer || m.footer }}</p>
      <p class="inv-footer-names">{{ names }}</p>
      <OrnamentArt :art="railArt" class="inv-footer-rail" />
    </footer>
  </div>
</template>

<style scoped>
/* ------------------------------------------------------------------- hero */
.hero {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100svh;
  padding-top: 2rem;
  text-align: center;
}
.hero-lang { position: absolute; inset-block-start: 0; inset-inline-end: 0.9rem; z-index: 2; display: flex; gap: 0.9rem; }
.hero-lang .text-button { font-size: 1rem; min-height: 2.75rem; padding-inline: 0.25rem; }
.hero-phases { width: min(100%, 30rem, 50svh); }
.hero-body { display: flex; flex-direction: column; align-items: center; flex: 1; }
.hero-heart { width: min(66vw, 19rem, 27svh); margin-top: -0.75rem; }
.hero-invite { margin-top: 0.9rem; color: var(--color-mute); font-size: 1.125rem; line-height: 1.4; text-wrap: balance; }
.hero-invite bdi { color: var(--color-ivory); font-weight: 500; }
.hero-names {
  display: flex;
  flex-direction: column;
  margin-top: 0.35rem;
  font-size: clamp(3.4rem, 16.5vw, 5rem);
  font-weight: 600;
  line-height: 1.02;
  color: var(--color-ivory);
  max-width: 100%;
  overflow-wrap: anywhere;
}
.hero-and { font-size: 0.42em; font-weight: 300; line-height: 1.25; color: var(--color-gold); }
.inv-en .hero-names { font-family: var(--font-fraktur); font-weight: 700; font-size: clamp(3.2rem, 15vw, 4.75rem); line-height: 1.08; }
.inv-en .hero-and { font-family: var(--font-display); }
.inv-ru .hero-names { font-weight: 700; font-size: clamp(3rem, 14vw, 4.6rem); line-height: 1.08; }
.inv-ru .hero-and { font-style: italic; }
.hero-other { margin-top: 0.7rem; color: var(--color-gold); font-family: var(--font-fraktur); font-size: 1.45rem; line-height: 1.2; }
.hero-other:lang(he), .hero-other:lang(ru) { font-family: var(--font-display); font-weight: 500; }
.hero-date { margin-top: 0.5rem; font-size: 1.6rem; line-height: 1.3; }

.hero-vine { position: absolute; inset-block-start: 38%; width: 3.4rem; opacity: 0.9; }
.hero-vine-start { left: 0; }
.hero-vine-end { right: 0; transform: scaleX(-1); }

.gate { position: relative; width: min(100%, 30rem, 40svh); margin-top: 0.75rem; }
.gate-art { width: 100%; }
/* Without the gate the plate stands on the railing. */
.gateless { display: grid; justify-items: center; gap: 1.5rem; width: min(100%, 30rem); margin-top: 1.75rem; }
.gateless .plate { min-width: 12rem; }
.gateless-rail { width: 100%; }
/* Pending: an unopened bud. Attending: the rose blooms. */
.gate :deep(.o-gate-rose) { transition: fill 0.8s ease; }
.gate-pending :deep(.o-gate-rose), .gate-declined :deep(.o-gate-rose) { fill: var(--color-ground); }
.gate-attending .gate-plate, .gate-declined .gate-plate { background: var(--color-ground); font-size: 1.0625rem; font-weight: 500; }
.gate-attending .gate-plate:hover, .gate-declined .gate-plate:hover { background: var(--color-plate-2); }
.gate-plate { position: absolute; inset-inline: 27%; inset-block-end: 12%; min-height: 3.25rem; padding-inline: 0.5rem; }

/* Short screens: keep the gate and its plate inside the first view. */
@media (max-height: 43.75rem) {
  .hero { padding-top: 1.5rem; }
  .hero-vine { width: 2.6rem; inset-block-start: 36%; }
  .hero-names, .inv-en .hero-names { font-size: clamp(2.75rem, 13.5vw, 4rem); }
  .hero-heart { width: min(58vw, 24svh); }
  .hero-invite { margin-top: 0.5rem; }
}

/* Wide screens: the briars stand at the edges of the column, like posts either side of the path. */
@media (min-width: 48rem) {
  .hero-vine { width: 4.5rem; left: calc(50% - 20rem); }
  .hero-vine-end { left: auto; right: calc(50% - 20rem); }
  .spray { width: 4rem; }
  .spray-start { inset-inline-start: -5.5rem; }
  .spray-end { inset-inline-end: -5.5rem; }
}

/* --------------------------------------------------------------- sections */
main { display: flex; flex-direction: column; gap: 4.5rem; padding-block: 4rem 1rem; text-align: center; }
.details, .rsvp { position: relative; }
/* Short briars entering from the page edges beside each heading. */
.spray { position: absolute; inset-block-start: -2.5rem; width: 3rem; }
.spray-start { inset-inline-start: -1.25rem; }
.spray-end { inset-inline-end: -1.25rem; }
/* The art enters from the left; flip whichever spray sits on the right. */
html[dir='rtl'] .spray-start, html[dir='ltr'] .spray-end { transform: scaleX(-1); }
.rule { width: min(15rem, 62%); margin-inline: auto; margin-bottom: 1.6rem; }

.details-intro { margin-top: 0.9rem; color: var(--color-mute); text-wrap: pretty; }
/* Russian writes weekdays in lower case; a date standing alone starts with a capital. */
.details-date::first-letter { text-transform: uppercase; }
.details-date { margin-top: 2.2rem; font-family: var(--font-display); font-size: 1.6rem; font-weight: 500; line-height: 1.3; }
.details-rail { width: 100%; margin-top: 1.4rem; }
.details-times { display: grid; grid-template-columns: 1fr 1fr; border-block-end: 1px solid var(--color-gold); }
.details-times > div { padding: 0.9rem 0.5rem 0.8rem; }
.details-times.is-single { grid-template-columns: 1fr; }
.details-times > div + div { border-inline-start: 1px solid var(--color-gold-dim); }
.details-times dt { color: var(--color-mute); font-size: 1.0625rem; }
.details-times dd { font-family: var(--font-display); font-size: 2.3rem; font-weight: 600; font-variant-numeric: lining-nums tabular-nums; line-height: 1.15; color: var(--color-ivory); direction: ltr; }
.details-venue { display: flex; flex-direction: column; margin-top: 1.9rem; font-style: normal; }
.details-venue strong { font-family: var(--font-display); font-size: 1.6rem; font-weight: 600; line-height: 1.3; }
.details-venue span { color: var(--color-mute); }
.details-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.25rem 1.75rem; margin-top: 0.6rem; }
.details-links:empty { display: none; }
.details-links a { min-height: 2.75rem; display: inline-flex; align-items: center; }
.details-note { margin-top: 1.6rem; color: var(--color-mute); text-wrap: balance; }
.details-note-long { white-space: pre-line; }
.details-note strong { color: var(--color-ivory); font-weight: 500; }

.rsvp { scroll-margin-top: 1.5rem; }
.rsvp-note { margin-top: 1rem; color: var(--color-mute); }

/* ------------------------------------------------------------------ photos */
.photo-arch { position: relative; width: min(100% - 5rem, 26rem); aspect-ratio: 3 / 4; margin-block: -1rem 0; }
.photo-arch img { width: 100%; height: 100%; object-fit: cover; clip-path: url(#arch-clip); }
.photo-arch-frame { position: absolute; inset: -0.5rem -0.5rem 0; width: calc(100% + 1rem); height: calc(100% + 0.5rem); }
.photo-frame { padding: 0.5rem; border: 1px solid var(--color-gold); outline: 1px solid var(--color-gold-dim); outline-offset: 0.35rem; }
.photo-frame img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; }

/* ------------------------------------------------------------------ footer */
.inv-footer { padding-block-start: 4.5rem; text-align: center; overflow: hidden; }
.inv-footer-seal { width: 5.5rem; margin: 0 auto 1.2rem; }
.inv-footer-rail { width: min(100%, 30rem); margin: 2.5rem auto 0; }
.inv-footer-line { color: var(--color-mute); }
.inv-footer-names { font-family: var(--font-display); font-size: 1.6rem; font-weight: 600; color: var(--color-gold); }
.inv-en .inv-footer-names { font-family: var(--font-fraktur); font-weight: 700; }
</style>
