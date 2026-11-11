<script setup lang="ts">
import type { AdminCampaign, SessionInfo } from '#shared/campaign'
import type { Stats } from '#shared/types'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Campaigns', htmlAttrs: { lang: 'en', dir: 'ltr' } })

type Row = AdminCampaign & { stats: Stats }
const { data: session } = await useAsyncData('session', () => useRequestFetch()<SessionInfo>('/api/admin/session'))
// A couple has exactly one campaign: take them straight to it.
if (session.value?.role === 'couple') await navigateTo(`/admin/c/${session.value.campaignId}`)

const { data: campaigns } = await useAsyncData('campaigns', () => useRequestFetch()<Row[]>('/api/admin/campaigns'), { default: () => [] })

const creator = ref<HTMLDialogElement>()
const form = reactive({ first: '', second: '', slug: '' })
const slugTouched = ref(false)
const error = ref('')
const busy = ref(false)

/** Suggest an address from the names until the owner types their own. */
const suggest = (v: string) => v.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
watch(() => [form.first, form.second], () => {
  if (!slugTouched.value) form.slug = [suggest(form.first), suggest(form.second)].filter(Boolean).join('-and-')
})

function openCreator() {
  Object.assign(form, { first: '', second: '', slug: '' })
  slugTouched.value = false
  error.value = ''
  creator.value?.showModal()
}
async function create() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const created = await adminFetch<AdminCampaign>('/api/admin/campaigns', {
      method: 'POST',
      body: { slug: form.slug, couple: { en: { first: form.first, second: form.second }, he: { first: '', second: '' } } },
    })
    await navigateTo(`/admin/c/${created.id}/details`)
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}
const statusText = { draft: 'Draft', live: 'Live', archived: 'Archived' }
</script>

<template>
  <div class="admin">
    <header class="a-band">
      <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-4">
        <h1 class="mr-auto">Campaigns</h1>
        <button class="a-btn" type="button" @click="openCreator">New campaign</button>
        <button class="a-btn a-btn-quiet" type="button" @click="signOut">Sign out</button>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 pb-16">
      <ul class="mt-5 grid gap-3">
        <li v-for="c in campaigns" :key="c.id" class="a-panel flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
          <div class="min-w-0 grow basis-64">
            <NuxtLink class="text-[1.0625rem] font-bold text-[var(--a-sec-text)] hover:underline" :to="`/admin/c/${c.id}`">{{ campaignName(c) }}</NuxtLink>
            <span class="a-tag ml-2" :class="`a-tag-${c.status === 'live' ? 'attending' : c.status === 'draft' ? 'pending' : 'declined'}`">{{ statusText[c.status] }}</span>
            <p class="muted truncate text-[0.8125rem]">{{ c.siteUrl.replace(/^https?:\/\//, '') }}<span v-if="c.content.date"> · {{ c.content.date }}</span><span v-if="!c.hasPassword"> · no couple login yet</span></p>
          </div>
          <dl class="flex gap-6 text-[0.8125rem]">
            <div><dt class="muted">Invited</dt><dd class="num text-[1.125rem] font-semibold">{{ c.stats.invited }}</dd></div>
            <div><dt class="muted">Attending</dt><dd class="num text-[1.125rem] font-semibold">{{ c.stats.confirmedAttendees }}</dd></div>
            <div><dt class="muted">No reply</dt><dd class="num text-[1.125rem] font-semibold">{{ c.stats.pending }}</dd></div>
          </dl>
          <div class="flex gap-2">
            <NuxtLink class="a-btn" :to="`/admin/c/${c.id}`">Open</NuxtLink>
            <!-- A draft is only visible to a signed-in admin, and the session belongs to this address, so drafts preview by path. -->
            <a class="a-btn" :href="c.status === 'draft' ? `/w/${c.slug}` : c.siteUrl" target="_blank" rel="noopener">{{ c.status === 'draft' ? 'Preview' : 'View' }}</a>
          </div>
        </li>
      </ul>
      <p v-if="!campaigns.length" class="a-panel muted mt-5 px-6 py-10 text-center">No campaigns yet. Create the first one for a couple.</p>
    </main>

    <dialog ref="creator" class="a-dialog" @click.self="creator?.close()">
      <form class="p-5" @submit.prevent="create">
        <h2>New campaign</h2>
        <p class="muted mt-1">It starts as a draft. You can fill in everything else afterwards, or hand it to the couple.</p>
        <div class="mt-4 grid grid-cols-2 gap-3">
          <label><span class="a-label">First name</span><input v-model="form.first" class="a-field" required maxlength="40" autocomplete="off"></label>
          <label><span class="a-label">Partner's first name</span><input v-model="form.second" class="a-field" required maxlength="40" autocomplete="off"></label>
        </div>
        <label class="a-label mt-4" for="slug">Address</label>
        <input id="slug" v-model="form.slug" class="a-field" required minlength="3" maxlength="40" pattern="[a-z0-9][a-z0-9-]+[a-z0-9]" autocapitalize="none" spellcheck="false" @input="slugTouched = true">
        <p class="muted mt-1 text-[0.8125rem]">Lowercase letters, digits and hyphens. It becomes the couple's web address and their sign-in name.</p>
        <p v-if="error" class="mt-3 text-danger" role="alert">{{ error }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="a-btn" type="button" @click="creator?.close()">Cancel</button>
          <button class="a-btn a-btn-primary" type="submit" :disabled="busy">Create campaign</button>
        </div>
      </form>
    </dialog>
  </div>
</template>
