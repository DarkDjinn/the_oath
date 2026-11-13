<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'
import { useInvitationPage, type StyleArt } from './useInvitationPage'
import type { Extra } from './draw'
import { vFit } from './fit'
import { ensureReadable } from './readable'
import './remix.css'

/**
 * The page every remix style is built on. A style (styles/<id>/index.vue) brings its hero art,
 * its tag line and its stylesheet; the page brings the couple's data and the RSVP.
 *
 * Two families, as in the designs: "poster" (the original ten: a hero with six placed text
 * blocks, then welcome, schedule, place and RSVP as separate sections) and "festival" (the
 * celebration ten: a hero with tag, line, names, date and badge, then a combined info card).
 * Each style's own CSS places and dresses every block; `art` slots let a style add drawings
 * that depend on its options.
 */
const props = defineProps<{
  campaign: PublicCampaign
  invitation: GuestInvitation | null
  token?: string
  art: StyleArt
  /** The style's short English tag (decorative, the same in every language). */
  tag: string
  /** Drawings an option adds to the hero: `back` goes behind the art, `front` over it. */
  extra?: Extra
}>()
const emit = defineEmits<{ update: [GuestInvitation] }>()

const p = useInvitationPage(props, props.art)
const { m, lang, others, setLang } = p
const family = computed(() => props.art.family)
/** Text stays readable on any colours: checked after each render and whenever the content changes (the RSVP steps, a language switch). */
const sheet = ref<HTMLElement | null>(null)
let pending = 0
const check = () => {
  cancelAnimationFrame(pending)
  pending = requestAnimationFrame(() => sheet.value && ensureReadable(sheet.value))
}
let watcher: MutationObserver | null = null
onMounted(() => {
  check()
  document.fonts?.ready.then(check)
  // Once more after the style's own CSS and its colour transitions have settled.
  setTimeout(check, 700)
  watcher = new MutationObserver(check)
  if (sheet.value) watcher.observe(sheet.value.querySelector('main') ?? sheet.value, { childList: true, subtree: true, characterData: true })
})
watch(() => [props.campaign.design, lang.value], () => nextTick(check), { deep: true })
onBeforeUnmount(() => watcher?.disconnect())

/** The hero art with the option drawings in place. */
const heroSvg = computed(() => {
  let svg = props.art.hero
  if (props.extra?.back) svg = svg.replace('<!--rx-back-->', props.extra.back)
  for (const [part, markup] of Object.entries(props.extra?.at ?? {})) svg = svg.replace(`<!--rx-at-${part}-->`, markup)
  if (props.extra?.front) svg = svg.replace(/<\/svg>$/, `${props.extra.front}</svg>`)
  return svg
})
</script>

<template>
  <div class="rx-outside">
    <article ref="sheet" class="rx" :class="[`rx-${p.look.value}`, `rx-${family}`, `rx-lang-${lang}`, `rx-${p.tokens.value.scheme}`, p.optionClasses.value, { 'rx-has-photo': p.hero.value }]" :style="p.vars.value">
      <header class="rx-topbar">
        <nav v-if="others.length" class="rx-lang" aria-label="Language">
          <button v-for="o in others" :key="o.id" type="button" :lang="o.id" :dir="o.dir" @click="setLang(o.id)">{{ o.name }}</button>
        </nav>
        <span class="rx-brand" dir="auto">{{ p.names.value }}</span>
      </header>

      <!-- ================================================================ poster -->
      <section v-if="family === 'poster'" class="rx-hero" :aria-label="p.headline.value || p.names.value">
        <div class="rx-hero-svg" v-html="heroSvg" />
        <slot name="hero-art" v-bind="p" />
        <div class="rx-h-kicker" dir="ltr" aria-hidden="true">{{ tag }}</div>
        <p v-fit class="rx-h-invite"><bdi v-if="invitation">{{ invitation.guestName }}</bdi>{{ p.inviteLine.value }}</p>
        <h1 v-fit:lines class="rx-h-title" :class="{ 'is-headline': p.headline.value }">
          <template v-if="p.headline.value"><span class="rx-line">{{ p.headline.value }}</span></template>
          <template v-else>
            <span class="rx-line"><bdi>{{ p.nameLines.value[0] }}</bdi></span>
            <span class="rx-line"><bdi>{{ p.nameLines.value[1] }}</bdi></span>
          </template>
        </h1>
        <p v-if="p.spacedDate.value" class="rx-h-date" dir="ltr">{{ p.spacedDate.value }}</p>
        <p v-if="p.weekday.value" class="rx-h-note">{{ p.weekday.value }}</p>
        <p v-if="p.subline.value" v-fit class="rx-h-latin" :dir="p.sublineLtr.value ? 'ltr' : 'auto'"><bdi>{{ p.subline.value }}</bdi></p>
      </section>

      <!-- ============================================================== festival -->
      <section v-else class="rx-hero" :aria-label="p.headline.value || p.names.value">
        <div class="rx-hero-art" v-html="heroSvg" />
        <slot name="hero-art" v-bind="p" />
        <div class="rx-hero-tag" dir="ltr" aria-hidden="true">{{ tag }}</div>
        <p v-fit class="rx-hero-text"><bdi v-if="invitation">{{ invitation.guestName }}</bdi>{{ p.inviteLine.value }}</p>
        <h1 v-fit:lines class="rx-hero-name">
          <span v-if="p.headline.value" class="rx-line">{{ p.headline.value }}</span>
          <span v-else class="rx-line rx-hebname"><bdi>{{ p.content.value.couple[lang].first }}</bdi> <i aria-hidden="true">+</i><span class="sr-only">{{ lang === 'he' ? 'ו' : lang === 'ru' ? 'и' : '&' }}</span> <bdi>{{ p.content.value.couple[lang].second }}</bdi></span>
        </h1>
        <p v-if="p.spacedDate.value" class="rx-hero-date" dir="ltr">{{ p.spacedDate.value }}</p>
        <p v-if="p.subline.value" v-fit class="rx-hero-badge" :dir="p.sublineLtr.value ? 'ltr' : 'auto'"><bdi>{{ p.subline.value }}</bdi></p>
        <p v-if="p.weekday.value" class="rx-hero-caption">{{ p.weekday.value }}</p>
      </section>

      <main :class="family === 'poster' ? 'rx-content' : 'rx-bodywrap'">
        <div v-if="extra?.body" class="rx-body-extra" aria-hidden="true" v-html="extra.body" />
        <slot name="before-welcome" v-bind="p" />
        <div :class="family === 'poster' ? 'rx-welcome' : 'rx-intro'">
          <h2 class="rx-welcome-title">{{ m.details.welcome }}</h2>
          <p class="rx-welcome-text">{{ p.copy.value.intro || m.details.intro }}</p>
        </div>
        <slot name="after-welcome" v-bind="p" />

        <figure v-if="p.hero.value" class="rx-photos" :class="[`rx-photos-${p.photoMode.value}`, { 'is-pair': p.paired.value }]">
          <img :srcset="p.srcset('hero', p.hero.value)" :src="p.photoSrc('hero', p.hero.value)" sizes="(min-width: 30rem) 26rem, 88vw" alt="" decoding="async">
          <img v-if="p.paired.value && p.second.value" :srcset="p.srcset('second', p.second.value)" :src="p.photoSrc('second', p.second.value)" sizes="(min-width: 30rem) 13rem, 44vw" alt="" decoding="async">
        </figure>

        <!-- poster: schedule, then place, each its own section -->
        <template v-if="family === 'poster'">
          <section v-if="p.times.value.length" class="rx-schedule" aria-labelledby="rx-schedule">
            <h2 id="rx-schedule" class="rx-label">{{ m.details.schedule }}</h2>
            <dl class="rx-times" :class="{ 'is-single': p.times.value.length < 2 }">
              <div v-for="t in p.times.value" :key="t.id"><dt><small>{{ t.label }}</small></dt><dd><b dir="ltr">{{ t.value }}</b></dd></div>
            </dl>
          </section>
          <slot name="after-schedule" v-bind="p" />
          <section v-if="p.hasPlace.value" class="rx-location" aria-labelledby="rx-place">
            <h2 id="rx-place">{{ m.details.location }}</h2>
            <p class="rx-address"><strong v-if="p.venue.value.name">{{ p.venue.value.name }}</strong><span v-if="p.venue.value.address">{{ p.venue.value.address }}</span></p>
            <div class="rx-maps">
              <a v-if="p.links.value.googleMaps" :href="p.links.value.googleMaps" target="_blank" rel="noopener noreferrer">{{ m.details.maps }}</a>
              <a v-if="p.links.value.waze" :href="p.links.value.waze" target="_blank" rel="noopener noreferrer">{{ m.details.waze }}</a>
              <a v-if="campaign.content.date && campaign.status === 'live'" :href="`/api/calendar/${campaign.slug}.ics`">{{ m.details.calendar }}</a>
            </div>
          </section>
        </template>

        <!-- festival: one card with the schedule, the place below it -->
        <template v-else>
          <section v-if="p.times.value.length" class="rx-info" aria-labelledby="rx-schedule">
            <h2 id="rx-schedule" class="rx-detail-head">{{ m.details.schedule }}</h2>
            <dl class="rx-row-time" :class="{ 'is-single': p.times.value.length < 2 }">
              <div v-for="t in p.times.value" :key="t.id" class="rx-time-slot"><dt>{{ t.label }}</dt><dd><strong dir="ltr">{{ t.value }}</strong></dd></div>
            </dl>
          </section>
          <slot name="after-schedule" v-bind="p" />
          <section v-if="p.hasPlace.value" class="rx-venue" aria-labelledby="rx-place">
            <h2 id="rx-place" class="rx-place">{{ m.details.location }}</h2>
            <p class="rx-address"><strong v-if="p.venue.value.name">{{ p.venue.value.name }}</strong><span v-if="p.venue.value.address">{{ p.venue.value.address }}</span></p>
            <div class="rx-navlinks">
              <a v-if="p.links.value.googleMaps" :href="p.links.value.googleMaps" target="_blank" rel="noopener noreferrer">{{ m.details.maps }}</a>
              <a v-if="p.links.value.waze" :href="p.links.value.waze" target="_blank" rel="noopener noreferrer">{{ m.details.waze }}</a>
              <a v-if="campaign.content.date && campaign.status === 'live'" :href="`/api/calendar/${campaign.slug}.ics`">{{ m.details.calendar }}</a>
            </div>
          </section>
        </template>

        <p v-if="p.dressCode.value" class="rx-note"><strong>{{ m.details.dressCode }}.</strong> {{ p.dressCode.value }}</p>
        <p v-if="p.notes.value" class="rx-note rx-note-long">{{ p.notes.value }}</p>

        <figure v-if="p.second.value && !p.paired.value" class="rx-photos rx-photos-second" :class="`rx-photos-${p.photoMode.value}`">
          <img :srcset="p.srcset('second', p.second.value)" :src="p.photoSrc('second', p.second.value)" sizes="(min-width: 30rem) 26rem, 88vw" alt="" loading="lazy" decoding="async">
        </figure>

        <section id="rsvp" class="rx-rsvp" aria-labelledby="rx-rsvp-title">
          <slot name="rsvp-art" v-bind="p" />
          <h2 id="rx-rsvp-title">{{ m.rsvp.title }}</h2>
          <RsvpForm
            v-if="invitation && token" :invitation="invitation" :token="token" :rsvp-by="p.rsvpBy.value" :closed="p.closed.value"
            :ask-dietary="p.content.value.rsvp.askDietary" :ask-message="p.content.value.rsvp.askMessage" @update="emit('update', $event)"
          />
          <p v-else class="rx-only-link">{{ m.rsvp.onlyByLink }}</p>
        </section>

        <footer :class="family === 'poster' ? 'rx-footer' : 'rx-foot'">
          <p v-if="p.copy.value.footer" class="rx-footer-line">{{ p.copy.value.footer }}</p>
          <p dir="ltr"><bdi>{{ p.latinNames.value || p.names.value }}</bdi><template v-if="p.numericDate.value"> · {{ p.numericDate.value }}</template></p>
        </footer>
      </main>
    </article>
  </div>
</template>
