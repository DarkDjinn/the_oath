<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import { fontsInUse, letteringVars } from '#shared/design/fonts'
import { designTokens, tokenVars } from '#shared/design/tokens'
import { joinNames, LOCALES, type GuestInvitation } from '#shared/types'
import { fontLinks } from '~/utils/fontFiles'

/**
 * Rose Keepsake: a warm, romantic invitation. A portrait of the couple opens the page,
 * their names follow in gold script with a ribbon, then the welcome, the evening's
 * schedule in a rounded card, the place, and the RSVP.
 * With an `invitation` (and its `token`) it is personal and carries the RSVP form;
 * without one it is the campaign's public, read-only page.
 */
const props = defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
const emit = defineEmits<{ update: [GuestInvitation] }>()

const { lang, m, dir, others, setLang } = useI18n()
const content = computed(() => props.campaign.content)
const options = computed(() => props.campaign.design.options)
const photos = computed(() => props.campaign.photos)

/** Every colour and typeface comes from the couple's design. */
const tokens = computed(() => designTokens(props.campaign.design))
const vars = computed(() => ({ ...tokenVars(tokens.value), ...letteringVars(props.campaign.design.lettering) }))

const names = computed(() => joinNames(content.value.couple[lang.value], lang.value))
const copy = computed(() => content.value.copy[lang.value])
/** A name of the couple's own, shown large; their names then move to the ribbon beneath it. */
const headline = computed(() => copy.value.headline || '')
const venue = computed(() => content.value.venue[lang.value])
const dressCode = computed(() => content.value.dressCode[lang.value])
const notes = computed(() => content.value.notes[lang.value])

const locale = computed(() => LOCALES[lang.value])
const at = (iso: string) => new Date(`${iso}T12:00:00Z`)
const numericDate = computed(() => content.value.date.split('-').reverse().join(' · '))
const longDate = computed(() => content.value.date
  ? new Intl.DateTimeFormat(locale.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(at(content.value.date))
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

const srcset = (slot: 'hero' | 'second', version: string) => [480, 800, 1200, 1800].map(w => `/photos/${props.campaign.id}/${slot}?w=${w}&v=${version} ${w}w`).join(', ')

useHead(() => ({
  // The colours sit on <html> too, so the ground reaches the edges of the window.
  htmlAttrs: { lang: lang.value, dir: dir.value, style: Object.entries(vars.value).map(([k, v]) => `${k}:${v}`).join(';') },
  title: headline.value || names.value,
  link: fontLinks(fontsInUse(props.campaign.design.lettering)),
}))
</script>

<template>
  <div class="keep" :class="[`keep-${lang}`, `keep-${tokens.scheme}`, `keep-button-${options.button ?? 'pill'}`]" :style="vars">
    <!-- Drawn once, used throughout. -->
    <svg width="0" height="0" class="k-defs" aria-hidden="true" focusable="false">
      <defs>
        <symbol id="k-heart" viewBox="0 0 26 24"><path d="M13 22C4 15 1.5 11 1.5 7.2 1.5 3.8 4 1.5 7 1.5c2.600 0 4.600 1.500 6 4 1.400-2.500 3.400-4 6-4 3 0 5.500 2.300 5.500 5.700C24.500 11 22 15 13 22Z" fill="none" stroke="currentColor" stroke-width="1.8" /></symbol>
        <symbol id="k-sprig" viewBox="0 0 80 110"><g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M10 106C24 78 34 50 66 8" /><path d="M22 84c-10-4-14-12-14-20 9 2 15 8 16 16M31 66c-9-6-11-15-9-23 8 4 12 11 11 19M42 49c-7-8-7-17-3-24 6 5 8 13 6 20M54 31c-4-8-2-16 3-21 4 6 4 13 1 19M27 78c9 1 17-2 22-9-9-3-17 0-21 6M38 60c9 0 16-5 20-12-9-1-16 3-19 9M49 43c8-2 14-8 16-15-8 0-14 5-16 12" /></g></symbol>
        <symbol id="k-reception" viewBox="0 0 40 40"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"><path d="M6 8h11l-1.500 10a4 4 0 0 1-8 0ZM11.500 22v10M7 33h9M23 10l10-4 2.500 10a4 4 0 0 1-7.500 3ZM31 21l3 9M30 32l8-3" /></g></symbol>
        <symbol id="k-ceremony" viewBox="0 0 44 36"><g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><circle cx="15" cy="22" r="10" /><circle cx="29" cy="22" r="10" /><path d="M12 9l3-5 3 5M26 9l3-5 3 5" /></g></symbol>
        <symbol id="k-pin" viewBox="0 0 20 26"><path d="M10 25C4 17 1.500 13 1.500 9.500a8.500 8.500 0 0 1 17 0C18.500 13 16 17 10 25Z" fill="currentColor" /><circle cx="10" cy="9.500" r="3" fill="var(--color-ground)" /></symbol>
      </defs>
    </svg>

    <header class="k-hero">
      <nav v-if="others.length" class="k-lang" aria-label="Language">
        <button v-for="o in others" :key="o.id" type="button" class="text-button" :lang="o.id" :dir="o.dir" @click="setLang(o.id)">{{ o.name }}</button>
      </nav>

      <figure v-if="photos.hero" class="k-portrait" :class="[`k-show-${options.portrait ?? 'gold'}`, `k-frame-${options.frame ?? 'arch'}`]">
        <span class="k-photo">
          <img :srcset="srcset('hero', photos.hero)" :src="`/photos/${campaign.id}/hero?w=800&v=${photos.hero}`" sizes="(min-width: 34rem) 30rem, 100vw" alt="" decoding="async" fetchpriority="high">
        </span>
      </figure>
      <!-- No photo yet: a wreath holds the place, so the page is complete without one. -->
      <div v-else class="k-wreath" aria-hidden="true">
        <svg class="k-wreath-l"><use href="#k-sprig" /></svg><svg class="k-wreath-heart"><use href="#k-heart" /></svg><svg class="k-wreath-r"><use href="#k-sprig" /></svg>
      </div>
      <template v-if="options.sprigs !== 'off' && photos.hero && options.frame !== 'none'">
        <svg class="k-sprig k-sprig-start" aria-hidden="true"><use href="#k-sprig" /></svg>
        <svg class="k-sprig k-sprig-end" aria-hidden="true"><use href="#k-sprig" /></svg>
      </template>

      <div class="k-col">
        <p class="k-kicker"><bdi v-if="invitation">{{ invitation.guestName }}</bdi>{{ inviteRest }}</p>
        <h1 class="k-headline" :class="{ 'is-names': !headline }">{{ headline || names }}</h1>
        <p v-if="headline" class="k-ribbon-row"><span class="k-ribbon">{{ names }}</span></p>
        <p v-if="content.date" class="k-date">{{ numericDate }}</p>
        <a v-if="invitation" href="#rsvp" class="k-cta">{{ invitation.rsvpStatus === 'pending' ? m.hero.confirm : m.hero.change }}</a>
      </div>
    </header>

    <main>
      <section class="k-col" aria-labelledby="k-welcome">
        <div class="k-rule" aria-hidden="true"><svg><use href="#k-heart" /></svg></div>
        <h2 id="k-welcome" class="k-title">{{ m.details.welcome }}</h2>
        <p class="k-text">{{ copy.intro || m.details.intro }}</p>
      </section>

      <figure v-if="photos.second" class="k-second k-col">
        <img :srcset="srcset('second', photos.second)" :src="`/photos/${campaign.id}/second?w=800&v=${photos.second}`" sizes="(min-width: 34rem) 28rem, 86vw" alt="" loading="lazy" decoding="async">
      </figure>

      <section class="k-col" aria-labelledby="k-schedule">
        <div class="k-card" :class="{ 'is-single': times.length < 2 }">
          <h2 id="k-schedule" class="k-tag">{{ m.details.schedule }}</h2>
          <p v-if="longDate" class="k-card-date">{{ longDate }}</p>
          <dl v-if="times.length" class="k-times">
            <div v-for="t in times" :key="t.id">
              <svg aria-hidden="true"><use :href="`#k-${t.id}`" /></svg>
              <dt>{{ t.label }}</dt>
              <dd>{{ t.value }}</dd>
            </div>
          </dl>
        </div>

        <template v-if="venue.name || venue.address || content.links.waze || content.links.googleMaps">
          <h2 class="k-place"><svg aria-hidden="true"><use href="#k-pin" /></svg>{{ m.details.location }}</h2>
          <address class="k-venue">
            <strong v-if="venue.name">{{ venue.name }}</strong>
            <span v-if="venue.address">{{ venue.address }}</span>
          </address>
        </template>
        <p class="k-nav">
          <a v-if="content.links.googleMaps" :href="content.links.googleMaps" target="_blank" rel="noopener noreferrer">{{ m.details.maps }}</a>
          <a v-if="content.links.waze" :href="content.links.waze" target="_blank" rel="noopener noreferrer">{{ m.details.waze }}</a>
          <a v-if="content.date && campaign.status === 'live'" :href="`/api/calendar/${campaign.slug}.ics`">{{ m.details.calendar }}</a>
        </p>
        <p v-if="dressCode" class="k-text k-note"><strong>{{ m.details.dressCode }}.</strong> {{ dressCode }}</p>
        <p v-if="notes" class="k-text k-note k-note-long">{{ notes }}</p>
      </section>

      <section id="rsvp" class="k-rsvp k-col" aria-labelledby="k-rsvp-title">
        <div class="k-rule" aria-hidden="true"><svg><use href="#k-heart" /></svg></div>
        <h2 id="k-rsvp-title" class="k-title">{{ m.rsvp.title }}</h2>
        <RsvpForm
          v-if="invitation && token" :invitation="invitation" :token="token" :rsvp-by="rsvpBy" :closed="closed"
          :ask-dietary="content.rsvp.askDietary" :ask-message="content.rsvp.askMessage" @update="emit('update', $event)"
        />
        <p v-else class="k-text">{{ m.rsvp.onlyByLink }}</p>
      </section>
    </main>

    <footer class="k-footer">
      <p class="k-footer-line">{{ copy.footer || m.hero.love }}</p>
      <p class="k-footer-names">{{ names }}</p>
    </footer>
  </div>
</template>

<style scoped>
.keep {
  --col: min(100% - 2.5rem, 27rem);
  /* Text set on the blush fill (ribbon, tag, button) takes the background colour. */
  --k-on-fill: var(--color-ground);
  position: relative;
  overflow-x: clip;
  min-height: 100svh;
  padding-bottom: 2.5rem;
  background:
    radial-gradient(ellipse 34rem 22rem at 50% 9rem, color-mix(in srgb, var(--color-plate-2) 80%, transparent), transparent 70%),
    var(--color-ground);
  color: var(--color-ivory);
  font-family: var(--font-body);
  font-size: 1.0625rem;
  line-height: 1.55;
  text-align: center;
}
.k-defs { position: absolute; }
.k-col { width: var(--col); margin-inline: auto; }

/* ------------------------------------------------------------------- hero */
.k-hero { position: relative; padding-top: 0.5rem; }
.k-lang { position: absolute; inset-block-start: 0.1rem; inset-inline-start: 0.9rem; z-index: 3; display: flex; gap: 0.9rem; }
.k-lang .text-button { min-height: 2.75rem; font-size: 0.9375rem; }

.k-portrait { position: relative; margin: 0 auto; }
.k-photo { display: block; overflow: hidden; }
.k-photo img { display: block; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; }

/* How the photo is shown */
.k-show-natural img { filter: saturate(0.94) contrast(1.03); }
.k-show-gold .k-photo, .k-show-rose .k-photo { position: relative; isolation: isolate; background: color-mix(in srgb, var(--color-gold) 62%, #fff); }
.k-show-rose .k-photo { background: color-mix(in srgb, var(--color-wine) 70%, #fff); }
.k-show-gold img, .k-show-rose img { filter: grayscale(1) contrast(1.15) brightness(1.05); mix-blend-mode: multiply; }
.k-show-gold .k-photo::after, .k-show-rose .k-photo::after { content: ''; position: absolute; inset: 0; background: color-mix(in srgb, var(--color-ground) 55%, var(--color-wine) 12%); mix-blend-mode: lighten; }
.keep-light .k-show-gold .k-photo, .keep-light .k-show-rose .k-photo { background: var(--color-ground); }
.keep-light .k-show-gold .k-photo::after { background: var(--color-gold); }
.keep-light .k-show-rose .k-photo::after { background: var(--color-wine); }
/* A drawing made for this page: its own dark ground disappears into ours. */
.k-show-artwork img { mix-blend-mode: lighten; }
.keep-light .k-show-artwork img { mix-blend-mode: multiply; }

/* Frames */
.k-frame-none { width: min(100%, 30rem); }
.k-frame-none .k-photo img { height: auto; max-height: 30rem; }
.k-frame-none:not(.k-show-artwork) .k-photo { -webkit-mask-image: linear-gradient(#000 62%, transparent); mask-image: linear-gradient(#000 62%, transparent); margin-bottom: -4.5rem; }
.k-show-artwork.k-frame-none .k-photo { -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent); mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent); }
.k-frame-arch, .k-frame-circle, .k-frame-frame { margin-top: 2.6rem; margin-bottom: 0.9rem; }
.k-frame-arch { width: min(62vw, 15rem); aspect-ratio: 7 / 8; }
.k-frame-arch .k-photo { height: 100%; border-radius: 999px 999px 0.6rem 0.6rem; outline: 1.2px solid var(--color-gold); outline-offset: 5px; }
.k-frame-circle { width: min(58vw, 14rem); aspect-ratio: 1; }
.k-frame-circle .k-photo { height: 100%; border-radius: 50%; outline: 1.2px solid var(--color-gold); outline-offset: 6px; }
.k-frame-frame { width: min(76vw, 18rem); aspect-ratio: 4 / 3; padding: 0.55rem; border: 1.2px solid var(--color-gold); border-radius: 0.4rem; }
.k-frame-frame .k-photo { height: 100%; border: 1px solid color-mix(in srgb, var(--color-gold) 55%, transparent); }

.k-sprig { position: absolute; top: 8.5rem; width: 4.6rem; height: 6.3rem; color: var(--color-gold); }
.k-sprig-start { inset-inline-start: max(0.5rem, calc(50% - 13.5rem)); }
.k-sprig-end { inset-inline-end: max(0.5rem, calc(50% - 13.5rem)); transform: scaleX(-1); }
[dir='rtl'] .k-sprig-start { transform: scaleX(-1); }
[dir='rtl'] .k-sprig-end { transform: none; }

.k-wreath { display: flex; justify-content: center; align-items: center; gap: 0.4rem; padding-top: 3.2rem; color: var(--color-gold); }
.k-wreath-l, .k-wreath-r { width: 4.8rem; height: 6.6rem; }
.k-wreath-r { transform: scaleX(-1); }
.k-wreath-heart { width: 2.6rem; height: 2.4rem; margin-top: 2.5rem; color: var(--color-wine); }

.k-kicker { margin-top: 0.75rem; font-size: 0.875rem; line-height: 1.5; text-wrap: balance; color: var(--color-ivory); }
.keep-en .k-kicker, .keep-ru .k-kicker { text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.8125rem; }
.k-kicker bdi { font-weight: 700; }
.k-headline { margin-top: 0.15rem; font-family: var(--font-fraktur); font-size: clamp(3rem, 15.5vw, 4.1rem); font-weight: 400; line-height: 1.05; color: var(--color-gold); text-wrap: balance; overflow-wrap: anywhere; }
/* Hebrew has no script face here: the names are set in the display serif, a little smaller and heavier. */
.keep-he .k-headline { font-family: var(--font-display); font-size: clamp(2.6rem, 13vw, 3.5rem); font-weight: 700; line-height: 1.15; }
.keep-he .k-headline:lang(he) { font-family: var(--font-display); }
.k-ribbon-row { display: flex; align-items: center; justify-content: center; gap: 0.7rem; margin-top: 0.45rem; }
.k-ribbon-row::before, .k-ribbon-row::after { content: ''; width: 2.2rem; height: 1px; background: var(--color-gold); }
.k-ribbon { padding: 0.15rem 1.7rem; background: var(--color-wine); color: var(--k-on-fill); font-size: 1.125rem; font-weight: 700; clip-path: polygon(0 0, 100% 0, calc(100% - 0.7rem) 50%, 100% 100%, 0 100%, 0.7rem 50%); }
.k-date { margin-top: 0.5rem; font-family: var(--font-numeral); font-size: 1.6rem; letter-spacing: 0.2em; direction: ltr; unicode-bidi: isolate; font-variant-numeric: lining-nums; }

/* ---------------------------------------------------------------- buttons */
.k-cta, .keep :deep(.form-submit) {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 3.25rem; margin-top: 1.1rem; padding: 0.6rem 2.2rem;
  border: 1.2px solid var(--color-wine); border-radius: 999px;
  background: var(--color-wine); color: var(--k-on-fill);
  font-family: var(--font-body); font-size: 1.125rem; font-weight: 700; text-decoration: none;
  transition: transform 0.25s var(--ease-out-expo), background-color 0.2s ease;
}
.k-cta:hover, .keep :deep(.form-submit:hover) { background: var(--color-wine-bright); border-color: var(--color-wine-bright); }
.k-cta:active { transform: translateY(1px); }
.keep-button-outline .k-cta, .keep-button-outline :deep(.form-submit) { background: transparent; color: var(--color-wine); }
.keep-button-outline .k-cta:hover, .keep-button-outline :deep(.form-submit:hover) { background: color-mix(in srgb, var(--color-wine) 16%, transparent); }

/* --------------------------------------------------------------- sections */
.k-rule { display: flex; align-items: center; gap: 0.6rem; margin-top: 1.9rem; color: var(--color-gold); }
.k-rule::before, .k-rule::after { content: ''; flex: 1; height: 1px; background: currentColor; opacity: 0.75; }
.k-rule svg { width: 0.95rem; height: 0.9rem; }
.k-title { margin-top: 0.6rem; font-family: var(--font-fraktur); font-size: 2.5rem; font-weight: 400; line-height: 1.15; color: var(--color-gold); }
.keep-he .k-title { font-family: var(--font-display); font-size: 2rem; font-weight: 700; }
.k-text { margin-top: 0.4rem; text-wrap: pretty; }
.k-note { margin-top: 1rem; color: var(--color-mute); }
.k-note strong { color: var(--color-ivory); }
.k-note-long { white-space: pre-line; }

.k-second { margin-top: 1.6rem; }
.k-second img { display: block; width: 100%; height: auto; border-radius: 0.6rem; outline: 1.2px solid var(--color-gold); outline-offset: 5px; }

.k-card { position: relative; margin-top: 2.6rem; padding: 1.5rem 0.75rem 1.1rem; border: 1.2px solid var(--color-gold); border-radius: 1.25rem; }
.k-tag { position: absolute; top: 0; left: 50%; translate: -50% -50%; padding: 0.1rem 1.2rem; border-radius: 999px; background: var(--color-wine); color: var(--k-on-fill); font-size: 0.9375rem; font-weight: 700; white-space: nowrap; }
.k-card-date { font-size: 1rem; color: var(--color-mute); }
.k-times { display: grid; grid-template-columns: 1fr 1fr; margin-top: 0.5rem; }
.is-single .k-times { grid-template-columns: 1fr; }
.k-times > div { display: grid; grid-template-columns: auto auto; justify-content: center; align-items: center; column-gap: 0.6rem; padding-inline: 0.4rem; }
.k-times > div + div { border-inline-start: 1px solid color-mix(in srgb, var(--color-gold) 60%, transparent); }
.k-times svg { grid-row: span 2; width: 2rem; height: 2rem; color: var(--color-gold); }
.k-times dt { font-size: 1.0625rem; line-height: 1.3; }
.k-times dd { justify-self: center; padding: 0 0.8rem; border: 1px solid var(--color-gold); border-radius: 999px; font-family: var(--font-numeral); font-size: 1.0625rem; letter-spacing: 0.05em; direction: ltr; }

.k-place { display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin-top: 1.5rem; font-family: var(--font-display); font-size: 1.4rem; font-weight: 400; font-style: italic; color: var(--color-gold); }
.keep-he .k-place { font-style: normal; font-weight: 700; }
.k-place svg { width: 0.95rem; height: 1.25rem; }
.k-venue { display: grid; margin-top: 0.15rem; font-style: normal; }
.k-venue strong { font-weight: 700; }
.k-nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.6rem; margin-top: 0.8rem; }
.k-nav a { flex: 1 1 9rem; display: grid; place-items: center; min-height: 2.75rem; padding: 0.3rem 0.9rem; border: 1.2px solid var(--color-gold); border-radius: 999px; color: var(--color-ivory); font-size: 0.9375rem; line-height: 1.25; text-decoration: none; text-wrap: balance; transition: background-color 0.2s ease; }
.k-nav a:hover { background: color-mix(in srgb, var(--color-gold) 16%, transparent); }

/* ------------------------------------------------------------------- rsvp */
.k-rsvp { scroll-margin-top: 1rem; }
.keep :deep(.field) { border-radius: 0.7rem; border-color: color-mix(in srgb, var(--color-gold) 55%, transparent); }
.keep :deep(.field::placeholder) { color: var(--color-mute); }
.keep :deep(.choice) { border-radius: 0.9rem; }
.keep :deep(.form-submit) { width: 100%; }
.keep :deep(.plate) { font-family: var(--font-body); }

/* ----------------------------------------------------------------- footer */
.k-footer { margin-top: 3rem; }
.k-footer-line { font-size: 0.8125rem; color: var(--color-mute); }
.keep-en .k-footer-line, .keep-ru .k-footer-line { text-transform: uppercase; letter-spacing: 0.2em; }
.k-footer-names { font-family: var(--font-fraktur); font-size: 1.7rem; line-height: 1.3; color: var(--color-gold); }
.keep-he .k-footer-names { font-family: var(--font-display); font-weight: 700; font-size: 1.4rem; }

.keep :focus-visible { outline: 2px solid var(--color-gold); outline-offset: 3px; }
.keep ::selection { background: var(--color-wine); color: var(--k-on-fill); }

@media (min-width: 48rem) {
  .keep { font-size: 1.125rem; }
  .k-frame-arch { width: 17rem; }
  .k-frame-circle { width: 15.5rem; }
  .k-frame-frame { width: 21rem; }
  .k-sprig { top: 9.5rem; }
}
</style>
