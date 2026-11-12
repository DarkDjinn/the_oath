<script setup lang="ts">
import type { AdminCampaign, CampaignContent } from '#shared/campaign'
import { directionOf, LANGUAGE_NAMES, LANGUAGES, type Language } from '#shared/types'

const { campaign, api, update } = useCampaignAdmin()
const form = reactive<CampaignContent>(structuredClone(toRaw(campaign.value.content)))
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const error = ref('')
const notice = ref('')
const busy = ref(false)

const langs = LANGUAGES.map(id => ({ id, label: LANGUAGE_NAMES[id], dir: directionOf(id), dict: dictionaries[id] }))
const enabled = (l: Language) => form.languages.includes(l)
function toggleLanguage(l: Language, on: boolean) {
  form.languages = on ? [...form.languages, l] : form.languages.filter(x => x !== l)
}
function makeDefault(l: Language) {
  form.languages = [l, ...form.languages.filter(x => x !== l)]
}

async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  notice.value = ''
  try {
    const next = await adminFetch<AdminCampaign>(`${api}/content`, { method: 'PUT', body: form })
    update(next)
    Object.assign(form, structuredClone(next.content))
    saved.value = JSON.stringify(form)
    notice.value = 'Saved. The invitation is updated.'
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}

// Leaving with unsaved edits asks first.
onBeforeRouteLeave(() => !dirty.value || window.confirm('You have unsaved changes on this page. Leave without saving?'))
</script>

<template>
  <form class="max-w-3xl" @submit.prevent="save">
    <section class="mt-6">
      <h2>The couple</h2>
      <p class="muted mt-1">Names appear large on the invitation. Fill in each language you offer; a language you switch off below is greyed out here.</p>
      <div class="mt-3 grid gap-4 sm:grid-cols-3">
        <fieldset v-for="l in langs" :key="l.id" class="a-panel p-4" :class="{ 'opacity-60': !enabled(l.id) }">
          <legend class="px-1 font-semibold">{{ l.label }}</legend>
          <label class="a-label" :for="`first-${l.id}`">First name</label>
          <input :id="`first-${l.id}`" v-model="form.couple[l.id].first" class="a-field" :dir="l.dir" maxlength="40" autocomplete="off">
          <label class="a-label mt-3" :for="`second-${l.id}`">Partner's first name</label>
          <input :id="`second-${l.id}`" v-model="form.couple[l.id].second" class="a-field" :dir="l.dir" maxlength="40" autocomplete="off">
        </fieldset>
      </div>
    </section>

    <section class="mt-8">
      <h2>Languages</h2>
      <p class="muted mt-1">Guests can switch between the languages you offer. The default is what a guest sees first unless you set a language on their invitation.</p>
      <div class="mt-3 flex flex-wrap gap-3">
        <div v-for="l in langs" :key="l.id" class="a-panel flex items-center gap-3 px-4 py-3">
          <label class="flex items-center gap-2"><input type="checkbox" class="size-4 accent-[var(--a-sec-text)]" :checked="enabled(l.id)" :disabled="enabled(l.id) && form.languages.length === 1" @change="toggleLanguage(l.id, ($event.target as HTMLInputElement).checked)"><span class="font-semibold">{{ l.label }}</span></label>
          <span v-if="form.languages[0] === l.id" class="muted text-[0.8125rem]">Default</span>
          <button v-else-if="enabled(l.id)" type="button" class="a-btn a-btn-sm" @click="makeDefault(l.id)">Make default</button>
        </div>
      </div>
    </section>

    <section class="mt-8">
      <h2>When</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-4">
        <label class="sm:col-span-2"><span class="a-label">Wedding date</span><input v-model="form.date" class="a-field" type="date"></label>
        <label><span class="a-label">Reception</span><input v-model="form.receptionTime" class="a-field" type="time"></label>
        <label><span class="a-label">Ceremony <span class="muted font-normal">(optional)</span></span><input v-model="form.ceremonyTime" class="a-field" type="time"></label>
      </div>
    </section>

    <section class="mt-8">
      <h2>Where</h2>
      <div class="mt-3 grid gap-4 sm:grid-cols-2">
        <div v-for="l in langs.filter(x => enabled(x.id))" :key="l.id">
          <label class="a-label" :for="`venue-${l.id}`">Venue name ({{ l.label }})</label>
          <input :id="`venue-${l.id}`" v-model="form.venue[l.id].name" class="a-field" :dir="l.dir" maxlength="80">
          <label class="a-label mt-3" :for="`address-${l.id}`">Address ({{ l.label }})</label>
          <input :id="`address-${l.id}`" v-model="form.venue[l.id].address" class="a-field" :dir="l.dir" maxlength="160">
        </div>
      </div>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label><span class="a-label">Waze link <span class="muted font-normal">(optional)</span></span><input v-model="form.links.waze" class="a-field" type="url" placeholder="https://waze.com/ul?…" maxlength="500"></label>
        <label><span class="a-label">Google Maps link <span class="muted font-normal">(optional)</span></span><input v-model="form.links.googleMaps" class="a-field" type="url" placeholder="https://maps.app.goo.gl/…" maxlength="500"></label>
      </div>
    </section>

    <section class="mt-8">
      <h2>Wording</h2>
      <p class="muted mt-1">Leave a field empty to use the standard text shown in grey.</p>
      <div v-for="l in langs.filter(x => enabled(x.id))" :key="l.id" class="a-panel mt-3 p-4">
        <h3 class="font-semibold">{{ l.label }}</h3>
        <label class="a-label mt-3" :for="`invite-${l.id}`">Invitation line, above the names</label>
        <input :id="`invite-${l.id}`" v-model="form.copy[l.id].invite" class="a-field" :dir="l.dir" maxlength="160" :placeholder="l.dict.hero.invite">
        <label class="a-label mt-3" :for="`headline-${l.id}`">Headline <span class="muted font-normal">(optional: a name of your own, such as a shared surname or nickname. Styles that have a headline show it large, with your names on a ribbon beneath)</span></label>
        <input :id="`headline-${l.id}`" v-model="form.copy[l.id].headline" class="a-field" :dir="l.dir" maxlength="40">
        <label class="a-label mt-3" :for="`intro-${l.id}`">Opening paragraph</label>
        <textarea :id="`intro-${l.id}`" v-model="form.copy[l.id].intro" class="a-field" rows="2" :dir="l.dir" maxlength="600" :placeholder="l.dict.details.intro" />
        <label class="a-label mt-3" :for="`dress-${l.id}`">Dress code <span class="muted font-normal">(optional)</span></label>
        <input :id="`dress-${l.id}`" v-model="form.dressCode[l.id]" class="a-field" :dir="l.dir" maxlength="600">
        <label class="a-label mt-3" :for="`notes-${l.id}`">Anything else guests should know <span class="muted font-normal">(optional: parking, children, shuttle)</span></label>
        <textarea :id="`notes-${l.id}`" v-model="form.notes[l.id]" class="a-field" rows="3" :dir="l.dir" maxlength="600" />
        <label class="a-label mt-3" :for="`footer-${l.id}`">Closing line</label>
        <input :id="`footer-${l.id}`" v-model="form.copy[l.id].footer" class="a-field" :dir="l.dir" maxlength="160" :placeholder="l.dict.footer">
      </div>
    </section>

    <div class="savebar">
      <p v-if="error" class="text-danger" role="alert">{{ error }}</p>
      <p v-else-if="notice && !dirty" class="muted" role="status">{{ notice }}</p>
      <p v-else-if="dirty" class="muted">Unsaved changes</p>
      <button class="a-btn a-btn-primary ml-auto" type="submit" :disabled="busy || !dirty">{{ busy ? 'Saving…' : 'Save details' }}</button>
    </div>
  </form>
</template>
