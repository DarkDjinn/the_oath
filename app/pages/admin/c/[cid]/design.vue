<script setup lang="ts">
import type { AdminCampaign } from '#shared/campaign'
import { FONT_ROLES, FONTS, fontsForRole, type FontRole } from '#shared/design/fonts'
import { COLOUR_ROLES, colourProblems, fixColours, PRESETS, presetsFor, themesFor, type ColourRole, type Design } from '#shared/themes'
import { LANGUAGES, type Language } from '#shared/types'
import { fontLinks } from '~/utils/fontFiles'

/**
 * The design studio. The invitation itself is the centre of the page; one topic's
 * controls show beside it at a time, and ready-made styles sit in a strip underneath.
 * Every change is drawn at once in the preview and nothing reaches guests until Save.
 */
const { campaign, api, isOwner, update } = useCampaignAdmin()

const themes = themesFor(campaign.value.slug)
const copy = (d: Design): Design => JSON.parse(JSON.stringify(d))
const draft = reactive<Design>(copy(campaign.value.design))
const saved = ref(JSON.stringify(draft))
const dirty = computed(() => JSON.stringify(draft) !== saved.value)
const definition = computed(() => themes[draft.theme]!)
const error = ref('')
const notice = ref('')
const busy = ref(false)

// ------------------------------------------------------------------ topics
const topics = computed(() => [
  { id: 'styles', label: 'Styles' },
  { id: 'colours', label: 'Colours' },
  { id: 'lettering', label: 'Lettering' },
  { id: 'ornaments', label: 'Ornaments' },
  { id: 'button', label: 'Button' },
  { id: 'photos', label: 'Photos' },
  { id: 'history', label: 'History' },
  ...(isOwner ? [{ id: 'css', label: 'Custom CSS' }] : []),
])
const topic = ref('styles')
const optionsFor = (id: string) => Object.entries(definition.value.options).filter(([, o]) => o.topic === id)

// ------------------------------------------------------------------ styles and colours
const presets = computed(() => presetsFor(draft.theme))
const roles = Object.keys(COLOUR_ROLES) as ColourRole[]
const swatchRoles = ['ground', 'text', 'accent', 'accent2'] as const
/** A style is a starting point: picking one replaces the six colours, which can then be changed freely. */
function usePreset(id: string) {
  draft.preset = id
  draft.colours = { ...PRESETS[id]!.colours }
}
function useTheme(id: string) {
  if (draft.theme === id) return
  draft.theme = id
  draft.options = { ...themes[id]!.defaults }
  usePreset(themes[id]!.preset)
}
const changed = computed(() => roles.some(role => draft.colours[role] !== PRESETS[draft.preset]?.colours[role]))
const problems = computed(() => colourProblems(draft.colours))

// ------------------------------------------------------------------ lettering
const fontRoles = Object.keys(FONT_ROLES) as FontRole[]
const names = computed(() => campaign.value.content.couple)
const sample = (role: FontRole) => {
  if (role === 'latin') return names.value.en.first ? `${names.value.en.first} & ${names.value.en.second}` : 'Anna & David'
  if (role === 'numeral') return campaign.value.content.date ? campaign.value.content.date.split('-').reverse().join(' · ') : '20 · 05 · 2027'
  return names.value.he.first ? `${names.value.he.first} ו${names.value.he.second}` : 'נועה ואיתי'
}
// The studio shows every face in its own letters; an invitation only ever loads the ones it uses.
useHead({ link: fontLinks(Object.keys(FONTS)) })

// ------------------------------------------------------------------ undo and redo
const past = ref<string[]>([])
const future = ref<string[]>([])
let settled = JSON.stringify(draft)
let stepTimer: ReturnType<typeof setTimeout> | undefined
let replaying = false
watch(draft, () => {
  if (replaying) return
  // Dragging a colour fires many changes; one pause is one step back.
  clearTimeout(stepTimer)
  stepTimer = setTimeout(() => {
    const now = JSON.stringify(draft)
    if (now === settled) return
    past.value = [...past.value.slice(-49), settled]
    future.value = []
    settled = now
  }, 350)
}, { deep: true })
function replay(from: Ref<string[]>, to: Ref<string[]>) {
  clearTimeout(stepTimer)
  const target = from.value.at(-1)
  if (!target) return
  from.value = from.value.slice(0, -1)
  to.value = [...to.value, JSON.stringify(draft)]
  load(JSON.parse(target))
}
const undo = () => replay(past, future)
const redo = () => replay(future, past)
/** Replace the whole draft without recording an undo step. */
function load(design: Design) {
  replaying = true
  Object.assign(draft, copy(design))
  settled = JSON.stringify(draft)
  nextTick(() => (replaying = false))
}

// ------------------------------------------------------------------ preview
// The preview is the real invitation page in a frame laid out at a true device width and scaled to fit.
const device = ref<'phone' | 'desktop'>('phone')
const languages = computed(() => LANGUAGES.filter(l => campaign.value.content.languages.includes(l)))
const previewLang = ref<Language>(campaign.value.content.languages[0] ?? 'he')
const languageNames: Record<Language, string> = { he: 'עברית', en: 'English', ru: 'Русский' }
const frame = ref<HTMLElement>()
const iframe = ref<HTMLIFrameElement>()
const scale = ref(1)
const logical = computed(() => (device.value === 'phone' ? { w: 390, h: 760 } : { w: 1280, h: 800 }))
const fit = () => { if (frame.value) scale.value = frame.value.clientWidth / logical.value.w }
let observer: ResizeObserver | undefined
watch(device, () => nextTick(fit))
// Photos are part of the page itself, so a new one reloads the frame; design changes never do.
const previewSrc = computed(() => `/w/${campaign.value.slug}?draft=1&t=${campaign.value.photos.hero ?? ''}${campaign.value.photos.second ?? ''}`)
const send = () => iframe.value?.contentWindow?.postMessage({ type: 'oath-preview', design: copy(draft), lang: previewLang.value }, location.origin)
const onFrameMessage = (event: MessageEvent) => {
  if (event.origin === location.origin && event.source === iframe.value?.contentWindow && event.data?.type === 'oath-preview-ready') send()
}
watch([draft, previewLang], send, { deep: true })
onMounted(() => {
  observer = new ResizeObserver(fit)
  if (frame.value) observer.observe(frame.value)
  window.addEventListener('message', onFrameMessage)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('message', onFrameMessage)
})

// ------------------------------------------------------------------ save
async function save() {
  if (busy.value || problems.value.length) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const next = await adminFetch<AdminCampaign>(`${api}/design`, { method: 'PUT', body: draft })
    update(next)
    load(next.design)
    saved.value = JSON.stringify(draft)
    notice.value = 'Saved. Guests now see this design.'
    versions.value = null
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}

// ------------------------------------------------------------------ history
interface Version { id: number, savedAt: string, design: Design }
const versions = ref<Version[] | null>(null)
const historyError = ref('')
async function loadVersions() {
  historyError.value = ''
  try { versions.value = await adminFetch<Version[]>(`${api}/design/versions`) }
  catch (e) { historyError.value = apiError(e) }
}
watch([topic, versions], () => topic.value === 'history' && versions.value === null && loadVersions())
/** Looking at an earlier design only changes the draft; it replaces the live one when saved, like any other change. */
function tryVersion(version: Version) {
  Object.assign(draft, copy({ ...version.design, customCss: draft.customCss }))
  notice.value = ''
}

// ------------------------------------------------------------------ photos
const slots = [
  { id: 'hero', label: 'Main photo', hint: 'Shown in an arched frame under the opening screen. Portrait works best.' },
  { id: 'second', label: 'Second photo', hint: 'Shown between the details and the RSVP. Landscape works best.' },
] as const
const photoBusy = ref('')
const photoError = ref('')

async function upload(slot: string, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoError.value = ''
  if (file.size > 12 * 1024 * 1024) return void (photoError.value = 'That photo is larger than 12 MB. Export a smaller copy and try again.')
  photoBusy.value = slot
  try {
    update(await adminFetch<AdminCampaign>(`${api}/photos/${slot}`, { method: 'PUT', body: file, headers: { 'content-type': file.type || 'application/octet-stream' } }))
  }
  catch (e) { photoError.value = apiError(e) }
  finally { photoBusy.value = '' }
}
async function removePhoto(slot: string) {
  photoBusy.value = slot
  photoError.value = ''
  try { update(await adminFetch<AdminCampaign>(`${api}/photos/${slot}`, { method: 'DELETE' })) }
  catch (e) { photoError.value = apiError(e) }
  finally { photoBusy.value = '' }
}

onBeforeRouteLeave(() => !dirty.value || window.confirm('You have unsaved design changes. Leave without saving?'))
</script>

<template>
  <form class="studio" @submit.prevent="save">
    <div class="bar">
      <div class="topics" role="tablist" aria-label="What to change">
        <button v-for="t in topics" :key="t.id" type="button" role="tab" class="topic" :class="{ 'is-on': topic === t.id }" :aria-selected="topic === t.id" @click="topic = t.id">{{ t.label }}</button>
      </div>
      <div class="actions">
        <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
        <p v-else-if="problems.length" class="text-warn">Colours need attention</p>
        <p v-else-if="dirty" class="muted">Unsaved changes</p>
        <p v-else-if="notice" class="muted" role="status">{{ notice }}</p>
        <button class="a-btn a-btn-sm" type="button" :disabled="!past.length" @click="undo">Undo</button>
        <button class="a-btn a-btn-sm" type="button" :disabled="!future.length" @click="redo">Redo</button>
        <button class="a-btn a-btn-primary" type="submit" :disabled="busy || !dirty || problems.length > 0">{{ busy ? 'Saving…' : 'Save design' }}</button>
      </div>
    </div>

    <div class="stage">
      <div class="stage-tools">
        <div class="seg" role="group" aria-label="Preview size">
          <button type="button" :class="{ 'is-on': device === 'phone' }" :aria-pressed="device === 'phone'" @click="device = 'phone'">Phone</button>
          <button type="button" :class="{ 'is-on': device === 'desktop' }" :aria-pressed="device === 'desktop'" @click="device = 'desktop'">Computer</button>
        </div>
        <div v-if="languages.length > 1" class="seg" role="group" aria-label="Preview language">
          <button v-for="l in languages" :key="l" type="button" :lang="l" :class="{ 'is-on': previewLang === l }" :aria-pressed="previewLang === l" @click="previewLang = l">{{ languageNames[l] }}</button>
        </div>
      </div>
      <div ref="frame" class="frame" :class="`frame-${device}`">
        <iframe ref="iframe" :src="previewSrc" title="Invitation preview" :style="{ width: `${logical.w}px`, height: `${logical.h}px`, transform: `scale(${scale})` }" />
      </div>
    </div>

    <section class="panel" :aria-label="topics.find(t => t.id === topic)?.label">
      <!-- Styles -->
      <template v-if="topic === 'styles'">
        <h2>Styles</h2>
        <p class="muted">A style is a starting point. Pick one, then change anything about it in the other tabs.</p>
        <div v-if="Object.keys(themes).length > 1" class="mt-3 grid gap-2">
          <button v-for="(theme, id) in themes" :key="id" type="button" class="pick" :class="{ 'is-on': draft.theme === id }" :aria-pressed="draft.theme === id" @click="useTheme(String(id))">
            <span class="font-semibold">{{ theme.name }}</span>
            <span class="muted block text-[0.8125rem]">{{ theme.description }}</span>
          </button>
        </div>
        <p v-else class="mt-3"><strong>{{ definition.name }}.</strong> <span class="muted">{{ definition.description }}</span></p>
        <div class="cards mt-4">
          <button v-for="(preset, id) in presets" :key="id" type="button" class="card" :class="{ 'is-on': draft.preset === id && !changed }" :aria-pressed="draft.preset === id && !changed" @click="usePreset(String(id))">
            <span class="card-art" aria-hidden="true" :style="{ background: preset.colours.ground, color: preset.colours.accent }">
              <i class="card-ring" :style="{ background: preset.colours.accent2 }" /><i class="card-line" :style="{ background: preset.colours.text }" /><i class="card-line card-line-short" :style="{ background: preset.colours.muted }" /><i class="card-button" />
            </span>
            <span class="card-name">{{ preset.name }}</span>
          </button>
        </div>
      </template>

      <!-- Colours -->
      <template v-else-if="topic === 'colours'">
        <h2>Colours</h2>
        <p class="muted">Start from a ready palette, or set each colour yourself.</p>
        <div class="mt-3 flex flex-wrap gap-2">
          <button v-for="(preset, id) in presets" :key="id" type="button" class="swatch" :class="{ 'is-on': draft.preset === id && !changed }" :aria-pressed="draft.preset === id && !changed" :title="preset.name" @click="usePreset(String(id))">
            <span class="swatch-bar" aria-hidden="true"><i v-for="role in swatchRoles" :key="role" :style="{ background: preset.colours[role] }" /></span>
            <span class="sr-only">{{ preset.name }}</span>
          </button>
        </div>
        <div class="mt-4 grid gap-2">
          <label v-for="role in roles" :key="role" class="colour">
            <input v-model="draft.colours[role]" type="color" :aria-label="COLOUR_ROLES[role]">
            <span class="grow">{{ COLOUR_ROLES[role] }}</span>
            <code class="muted">{{ draft.colours[role] }}</code>
          </label>
        </div>
        <div v-if="problems.length" class="warn mt-3" role="status">
          <p class="font-semibold">Guests would struggle to read this, so it cannot be saved yet:</p>
          <ul class="mt-1 list-disc pl-5"><li v-for="p in problems" :key="p.role + p.on">{{ p.what }} (contrast {{ p.ratio.toFixed(1) }}, needs {{ p.needed }})</li></ul>
          <button class="a-btn a-btn-sm mt-2" type="button" @click="draft.colours = fixColours(draft.colours)">Adjust the colours for me</button>
        </div>
        <p v-else class="ok mt-3">Easy to read.</p>
        <p v-if="changed" class="muted mt-2 text-[0.8125rem]">Your own colours, starting from {{ PRESETS[draft.preset]?.name }}. <button type="button" class="link" @click="usePreset(draft.preset)">Back to the original</button></p>
      </template>

      <!-- Lettering -->
      <template v-else-if="topic === 'lettering'">
        <h2>Lettering</h2>
        <p class="muted">Choose a typeface for each kind of text. Every face is shown in its own letters.</p>
        <fieldset v-for="role in fontRoles" :key="role" class="mt-4">
          <legend class="a-label">{{ FONT_ROLES[role].label }}</legend>
          <div class="faces">
            <label v-for="(font, id) in fontsForRole(role)" :key="id" class="face" :class="{ 'is-on': draft.lettering[role] === id }">
              <input v-model="draft.lettering[role]" type="radio" :name="`font-${role}`" :value="id" class="sr-only">
              <bdi class="face-sample" :style="{ fontFamily: `'${font.family}', var(--font-ui)` }" :lang="FONT_ROLES[role].needs === 'he' ? 'he' : 'en'">{{ sample(role) }}</bdi>
              <span class="face-name">{{ font.label }} <span class="muted">· {{ font.mood }}</span></span>
            </label>
          </div>
        </fieldset>
      </template>

      <!-- Ornaments and Button: the theme's own choices -->
      <template v-else-if="topic === 'ornaments' || topic === 'button'">
        <h2>{{ topic === 'ornaments' ? 'Ornaments and backdrop' : 'RSVP button' }}</h2>
        <fieldset v-for="[key, option] in optionsFor(topic)" :key="key" class="mt-4">
          <legend class="a-label">{{ option.label }}</legend>
          <div class="flex flex-wrap gap-2">
            <label v-for="(label, value) in option.choices" :key="value" class="chip" :class="{ 'is-on': draft.options[key] === value }">
              <input v-model="draft.options[key]" type="radio" :name="`opt-${key}`" :value="value" class="sr-only">{{ label }}
            </label>
          </div>
        </fieldset>
        <p v-if="!optionsFor(topic).length" class="muted mt-3">This style has nothing to choose here.</p>
      </template>

      <!-- Photos -->
      <template v-else-if="topic === 'photos'">
        <h2>Photos</h2>
        <p class="muted">Optional. The invitation is complete without them. JPEG, PNG, WebP or AVIF, up to 12 MB. Photos are saved as soon as they upload.</p>
        <p v-if="photoError" class="mt-3 text-danger" role="alert">{{ photoError }}</p>
        <div v-for="slot in slots" :key="slot.id" class="mt-4">
          <h3>{{ slot.label }}</h3>
          <p class="muted text-[0.8125rem]">{{ slot.hint }}</p>
          <img v-if="campaign.photos[slot.id]" class="mt-2 h-36 w-full rounded-md object-cover" :src="`/photos/${campaign.id}/${slot.id}?w=480&v=${campaign.photos[slot.id]}`" alt="">
          <div v-else class="muted mt-2 grid h-24 place-items-center rounded-md border border-dashed border-[var(--a-line-strong)] text-[0.8125rem]">No photo</div>
          <div class="mt-2 flex gap-2">
            <label class="a-btn a-btn-sm" :class="{ 'opacity-50': photoBusy === slot.id }">
              {{ photoBusy === slot.id ? 'Working…' : campaign.photos[slot.id] ? 'Replace' : 'Upload' }}
              <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="!!photoBusy" @change="upload(slot.id, $event)">
            </label>
            <button v-if="campaign.photos[slot.id]" class="a-btn a-btn-sm a-btn-danger" type="button" :disabled="!!photoBusy" @click="removePhoto(slot.id)">Remove</button>
          </div>
        </div>
      </template>

      <!-- History -->
      <template v-else-if="topic === 'history'">
        <h2>History</h2>
        <p class="muted">The designs you saved before this one. Try one on; it only replaces the current design when you save.</p>
        <p v-if="historyError" class="mt-3 text-danger" role="alert">{{ historyError }}</p>
        <p v-else-if="versions === null" class="muted mt-3">Loading…</p>
        <p v-else-if="!versions.length" class="muted mt-3">Nothing yet. Each time you save, the design it replaces is kept here (the last 10).</p>
        <ul v-else class="mt-3 grid gap-2">
          <li v-for="v in versions" :key="v.id" class="version">
            <span class="swatch-bar" aria-hidden="true"><i v-for="role in swatchRoles" :key="role" :style="{ background: v.design.colours[role] }" /></span>
            <span class="grow"><strong class="block">{{ PRESETS[v.design.preset]?.name ?? v.design.preset }}</strong><span class="muted text-[0.8125rem]">Replaced {{ formatWhen(v.savedAt) }}</span></span>
            <button class="a-btn a-btn-sm" type="button" @click="tryVersion(v)">Try it on</button>
          </li>
        </ul>
      </template>

      <!-- Custom CSS -->
      <template v-else-if="topic === 'css'">
        <h2>Custom CSS <span class="muted text-[0.8125rem] font-normal">(owner only)</span></h2>
        <p class="muted">For one-off adjustments to this couple's invitation. Applied after the style. Save to see it in the preview.</p>
        <textarea v-model="draft.customCss" class="a-field mt-2 font-mono text-[0.8125rem]" rows="10" spellcheck="false" placeholder=".hero-names { letter-spacing: 0.02em; }" />
      </template>
    </section>

    <!-- Ready-made styles stay one tap away, whatever is being edited. -->
    <div class="film" aria-label="Ready-made styles">
      <button v-for="(preset, id) in presets" :key="id" type="button" class="film-item" :class="{ 'is-on': draft.preset === id && !changed }" :aria-pressed="draft.preset === id && !changed" @click="usePreset(String(id))">
        <span class="swatch-bar" aria-hidden="true"><i v-for="role in swatchRoles" :key="role" :style="{ background: preset.colours[role] }" /></span>
        {{ preset.name }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.grow { flex: 1; min-width: 0; }
.link { text-decoration: underline; text-underline-offset: 2px; color: var(--a-sec-text); font-weight: 600; }

/* Phone first: preview pinned on top, then the topics, the open topic, and the styles strip. */
.studio { display: grid; grid-template-areas: 'stage' 'bar' 'panel' 'film'; gap: 0.9rem; }
.bar { grid-area: bar; display: grid; gap: 0.6rem; min-width: 0; }
.topics { display: flex; gap: 0.25rem; overflow-x: auto; scrollbar-width: none; margin-inline: -1rem; padding-inline: 1rem; }
.topic { flex: none; min-height: 2.25rem; padding: 0.3rem 0.8rem; border-radius: 999px; color: var(--a-mute); font-weight: 600; white-space: nowrap; }
.topic:hover { color: var(--a-ink); background: var(--a-hover); }
.topic.is-on { background: var(--a-sec-tint); color: var(--a-sec-text); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a-sec-text) 35%, transparent); }
.actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.actions p { flex: 1; min-width: 8rem; font-size: 0.875rem; }

.stage { grid-area: stage; position: sticky; top: 0; z-index: 5; display: grid; justify-items: center; align-content: start; gap: 0.5rem; margin-inline: -1rem; padding: 0.6rem 1rem; background: var(--a-tint); border-bottom: 1px solid var(--a-line); }
.stage-tools { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; }
.seg { display: inline-flex; overflow: hidden; border: 1px solid var(--a-line-strong); border-radius: 7px; background: var(--a-surface); }
.seg button { min-height: 1.875rem; padding: 0.15rem 0.7rem; font-size: 0.8125rem; font-weight: 600; color: var(--a-mute); }
.seg button.is-on { background: var(--a-ink); color: #fff; }
.frame { position: relative; overflow: hidden; border: 1px solid var(--a-line-strong); border-radius: 12px; background: #000; box-shadow: 0 12px 28px -14px rgb(21 27 46 / 0.45), 0 2px 6px rgb(21 27 46 / 0.12); }
.frame iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; }
.frame-phone { width: min(100%, 9.75rem); aspect-ratio: 390 / 760; }
.frame-desktop { width: min(100%, 26rem); aspect-ratio: 1280 / 800; }

.panel { grid-area: panel; min-width: 0; }
.film { grid-area: film; display: flex; gap: 0.5rem; overflow-x: auto; scrollbar-width: thin; margin-inline: -1rem; padding: 0.25rem 1rem 0.5rem; }
.film-item { flex: none; display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.5rem; padding: 0.3rem 0.8rem 0.3rem 0.35rem; border: 1px solid var(--a-line-strong); border-radius: 8px; background: var(--a-surface); font-weight: 600; font-size: 0.875rem; white-space: nowrap; }

@media (min-width: 64rem) {
  .studio { grid-template-columns: minmax(0, 1fr) 24rem; grid-template-areas: 'bar bar' 'stage panel' 'film panel'; gap: 0; margin-top: 1.25rem; border: 1px solid var(--a-line); border-radius: 12px; background: var(--a-surface); overflow: clip; }
  .bar { grid-template-columns: minmax(0, 1fr) auto; align-items: center; padding: 0.6rem 1rem; border-bottom: 1px solid var(--a-line); }
  .topics { margin: 0; padding: 0; }
  .actions p { flex: none; min-width: 0; }
  /* The invitation stays in view while a long topic (lettering) scrolls beside it. */
  .stage { align-self: start; margin: 0; padding: 1.25rem 1rem 1.5rem; border-bottom: 0; background: none; }
  .studio { background: linear-gradient(to right, var(--a-tint) calc(100% - 24rem), var(--a-surface) 0); }
  .bar { background: var(--a-surface); }
  .frame-phone { max-height: calc(100svh - 7rem); width: auto; height: 38rem; }
  .frame-desktop { width: 100%; }
  .panel { grid-row: 2 / 4; align-self: stretch; padding: 1.1rem 1.25rem 1.5rem; border-left: 1px solid var(--a-line); }
  .film { margin: 0; padding: 0.75rem 1rem; border-top: 1px solid var(--a-line); align-self: end; }
}

.pick { display: block; width: 100%; padding: 0.7rem 0.9rem; border: 1px solid var(--a-line-strong); border-radius: 8px; text-align: start; }
.chip { display: inline-flex; align-items: center; min-height: 2.25rem; padding: 0.3rem 0.8rem; border: 1px solid var(--a-line-strong); border-radius: 999px; background: var(--a-surface); cursor: pointer; font-weight: 600; }
.pick:hover, .chip:hover, .swatch:hover, .card:hover, .face:hover, .film-item:hover { border-color: var(--a-line-hover); }
.pick.is-on, .chip.is-on, .swatch.is-on, .card.is-on, .face.is-on, .film-item.is-on { border-color: var(--a-sec-text); background: var(--a-sec-tint); color: var(--a-ink); box-shadow: inset 0 0 0 1px var(--a-sec-text); }
.chip:has(:focus-visible), .face:has(:focus-visible) { outline: 2px solid var(--a-sec-text); outline-offset: 2px; }

.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(6.25rem, 1fr)); gap: 0.6rem; }
.card { display: grid; align-content: start; gap: 0.4rem; padding: 0.35rem 0.35rem 0.5rem; border: 1px solid var(--a-line-strong); border-radius: 10px; background: var(--a-surface); text-align: center; }
.card-art { display: grid; justify-items: center; align-content: center; gap: 0.3rem; aspect-ratio: 3 / 4; border-radius: 6px; border: 1px solid rgb(21 27 46 / 0.18); }
.card-ring { width: 34%; aspect-ratio: 1; border: 1.5px solid currentColor; border-radius: 50%; margin-bottom: 0.2rem; background-clip: content-box; padding: 22%; }
.card-line { width: 56%; height: 0.3rem; border-radius: 2px; }
.card-line-short { width: 36%; height: 0.2rem; }
.card-button { width: 44%; height: 0.55rem; margin-top: 0.3rem; border: 1.5px solid currentColor; border-radius: 2px; }
.card-name { font-size: 0.8125rem; font-weight: 600; line-height: 1.25; text-wrap: balance; }

.swatch { display: inline-flex; padding: 0.3rem; border: 1px solid var(--a-line-strong); border-radius: 8px; background: var(--a-surface); }
.swatch-bar { flex: none; display: flex; width: 3.25rem; height: 1.75rem; overflow: hidden; border-radius: 5px; border: 1px solid rgb(21 27 46 / 0.2); }
.swatch-bar i { flex: 1; }
.colour { display: flex; align-items: center; gap: 0.7rem; cursor: pointer; }
.colour input { flex: none; width: 2.5rem; height: 2.5rem; padding: 0; border: 1px solid var(--a-line-strong); border-radius: 8px; background: none; cursor: pointer; }
.colour input::-webkit-color-swatch-wrapper { padding: 3px; }
.colour input::-webkit-color-swatch { border: 0; border-radius: 5px; }
.colour input::-moz-color-swatch { border: 0; border-radius: 5px; }
.colour code { padding: 0; background: none; font-size: 0.75rem; }
.warn { padding: 0.75rem; border-radius: 8px; background: var(--a-wait-bg); color: var(--a-wait-ink); }
.ok { color: var(--a-ok-ink); font-weight: 600; font-size: 0.875rem; }

.faces { display: grid; gap: 0.35rem; max-height: 15.5rem; overflow-y: auto; padding: 2px; scrollbar-width: thin; }
.face { display: grid; gap: 0.1rem; padding: 0.45rem 0.7rem; border: 1px solid var(--a-line); border-radius: 8px; cursor: pointer; }
.face-sample { font-size: 1.5rem; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.face-name { font-size: 0.75rem; font-weight: 600; }
.face-name .muted { font-weight: 400; }

.version { display: flex; align-items: center; gap: 0.7rem; padding: 0.5rem 0.6rem; border: 1px solid var(--a-line); border-radius: 8px; }
</style>
