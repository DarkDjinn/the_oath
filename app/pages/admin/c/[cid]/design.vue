<script setup lang="ts">
import type { AdminCampaign } from '#shared/campaign'
import { themesFor } from '#shared/themes'

const { campaign, api, isOwner, update } = useCampaignAdmin()

const themes = themesFor(campaign.value.slug)
const draft = reactive({ theme: campaign.value.design.theme, options: { ...campaign.value.design.options }, customCss: campaign.value.design.customCss })
const saved = ref(JSON.stringify(draft))
const dirty = computed(() => JSON.stringify(draft) !== saved.value)
const definition = computed(() => themes[draft.theme]!)
const error = ref('')
const notice = ref('')
const busy = ref(false)

// Switching theme starts from that theme's own defaults.
watch(() => draft.theme, theme => (draft.options = { ...themes[theme]!.defaults }))

// The preview is the real invitation page, rendered with the unsaved choices.
const device = ref<'phone' | 'desktop'>('phone')
// The iframe is laid out at a real device width and scaled to fit the column.
const frame = ref<HTMLElement>()
const scale = ref(1)
const logical = computed(() => (device.value === 'phone' ? { w: 390, h: 760 } : { w: 1280, h: 800 }))
const fit = () => { if (frame.value) scale.value = frame.value.clientWidth / logical.value.w }
let observer: ResizeObserver | undefined
onMounted(() => {
  observer = new ResizeObserver(fit)
  if (frame.value) observer.observe(frame.value)
})
onBeforeUnmount(() => observer?.disconnect())
watch(device, () => nextTick(fit))
const previewSrc = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
const refreshPreview = () => {
  previewSrc.value = `/w/${campaign.value.slug}?draft=${encodeURIComponent(JSON.stringify({ theme: draft.theme, options: draft.options }))}&t=${campaign.value.photos.hero ?? ''}${campaign.value.photos.second ?? ''}`
}
watch(() => [draft.theme, draft.options, campaign.value.photos], () => {
  clearTimeout(timer)
  timer = setTimeout(refreshPreview, 150)
}, { deep: true })
onMounted(refreshPreview)

async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const next = await adminFetch<AdminCampaign>(`${api}/design`, { method: 'PUT', body: draft })
    update(next)
    Object.assign(draft, { theme: next.design.theme, options: { ...next.design.options }, customCss: next.design.customCss })
    await nextTick()
    saved.value = JSON.stringify(draft)
    notice.value = 'Saved. Guests now see this design.'
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
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
  <div class="layout mt-6">
    <form class="min-w-0" @submit.prevent="save">
      <section v-if="Object.keys(themes).length > 1">
        <h2>Style</h2>
        <div class="mt-3 grid gap-2">
          <label v-for="(theme, id) in themes" :key="id" class="pick" :class="{ 'is-on': draft.theme === id }">
            <input v-model="draft.theme" type="radio" name="theme" :value="id" class="sr-only">
            <span class="font-semibold">{{ theme.name }}</span>
            <span class="muted block text-[0.8125rem]">{{ theme.description }}</span>
          </label>
        </div>
      </section>
      <section v-else>
        <h2>{{ definition.name }}</h2>
        <p class="muted mt-1">{{ definition.description }}</p>
      </section>

      <fieldset v-for="(option, key) in definition.options" :key="key" class="mt-6">
        <legend class="a-label">{{ option.label }}</legend>
        <div class="flex flex-wrap gap-2">
          <label v-for="(label, value) in option.choices" :key="value" class="chip" :class="{ 'is-on': draft.options[key] === value }">
            <input v-model="draft.options[key]" type="radio" :name="`opt-${key}`" :value="value" class="sr-only">{{ label }}
          </label>
        </div>
      </fieldset>

      <section v-if="isOwner" class="mt-8">
        <h2>Custom CSS <span class="muted text-[0.8125rem] font-normal">(owner only)</span></h2>
        <p class="muted mt-1">For one-off adjustments to this couple's invitation. Applied after the theme. Save to see it in the preview.</p>
        <textarea v-model="draft.customCss" class="a-field mt-2 font-mono text-[0.8125rem]" rows="5" spellcheck="false" placeholder=".hero-names { letter-spacing: 0.02em; }" />
      </section>

      <div class="savebar">
        <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
        <p v-else-if="notice && !dirty" class="muted" role="status">{{ notice }}</p>
        <p v-else-if="dirty" class="muted">Previewing unsaved changes</p>
        <button class="a-btn a-btn-primary ml-auto" type="submit" :disabled="busy || !dirty">{{ busy ? 'Saving…' : 'Save design' }}</button>
      </div>

      <section class="mt-8">
        <h2>Photos</h2>
        <p class="muted mt-1">Optional. The invitation is complete without them. JPEG, PNG, WebP or AVIF, up to 12 MB.</p>
        <p v-if="photoError" class="mt-3 text-danger" role="alert">{{ photoError }}</p>
        <div class="mt-3 grid gap-3 sm:grid-cols-2">
          <div v-for="slot in slots" :key="slot.id" class="a-panel p-4">
            <h3>{{ slot.label }}</h3>
            <p class="muted text-[0.8125rem]">{{ slot.hint }}</p>
            <img v-if="campaign.photos[slot.id]" class="mt-3 h-40 w-full rounded-md object-cover" :src="`/photos/${campaign.id}/${slot.id}?w=480&v=${campaign.photos[slot.id]}`" alt="">
            <div v-else class="muted mt-3 grid h-40 place-items-center rounded-md border border-dashed border-[var(--a-line-strong)] text-[0.8125rem]">No photo</div>
            <div class="mt-3 flex gap-2">
              <label class="a-btn a-btn-sm" :class="{ 'opacity-50': photoBusy === slot.id }">
                {{ photoBusy === slot.id ? 'Working…' : campaign.photos[slot.id] ? 'Replace' : 'Upload' }}
                <input type="file" class="sr-only" accept="image/jpeg,image/png,image/webp,image/avif" :disabled="!!photoBusy" @change="upload(slot.id, $event)">
              </label>
              <button v-if="campaign.photos[slot.id]" class="a-btn a-btn-sm a-btn-danger" type="button" :disabled="!!photoBusy" @click="removePhoto(slot.id)">Remove</button>
            </div>
          </div>
        </div>
      </section>
    </form>

    <aside class="preview" aria-label="Preview">
      <div class="mb-2 flex items-center gap-2">
        <h2 class="mr-auto">Preview</h2>
        <button type="button" class="chip" :class="{ 'is-on': device === 'phone' }" @click="device = 'phone'">Phone</button>
        <button type="button" class="chip" :class="{ 'is-on': device === 'desktop' }" @click="device = 'desktop'">Computer</button>
      </div>
      <div ref="frame" class="frame" :class="`frame-${device}`">
        <iframe v-if="previewSrc" :src="previewSrc" title="Invitation preview" :style="{ width: `${logical.w}px`, height: `${logical.h}px`, transform: `scale(${scale})` }" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
.layout { display: grid; gap: 2rem; }
@media (min-width: 64rem) { .layout { grid-template-columns: minmax(0, 1fr) 26rem; align-items: start; } .preview { position: sticky; top: 1rem; } }

.pick { display: block; padding: 0.7rem 0.9rem; border: 1px solid var(--a-line-strong); border-radius: 8px; cursor: pointer; }
.chip { display: inline-flex; align-items: center; min-height: 2.25rem; padding: 0.3rem 0.8rem; border: 1px solid var(--a-line-strong); border-radius: 999px; background: var(--a-surface); cursor: pointer; font-weight: 600; }
.pick:hover, .chip:hover { border-color: var(--a-line-hover); }
.pick.is-on, .chip.is-on { border-color: var(--a-sec-text); background: var(--a-sec-tint); color: var(--a-ink); box-shadow: inset 0 0 0 1px var(--a-sec-text); }
.pick:has(:focus-visible), .chip:has(:focus-visible) { outline: 2px solid var(--a-sec-text); outline-offset: 2px; }

.frame { position: relative; overflow: hidden; border: 1px solid var(--a-line-strong); border-radius: 12px; background: #000; }
.frame iframe { position: absolute; top: 0; left: 0; border: 0; transform-origin: 0 0; }
.frame-phone { width: min(100%, 23.4rem); aspect-ratio: 390 / 760; margin-inline: auto; }
.frame-desktop { width: 100%; aspect-ratio: 1280 / 800; }
</style>
