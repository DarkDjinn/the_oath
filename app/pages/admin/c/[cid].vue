<script setup lang="ts">
import type { AdminCampaign, SessionInfo } from '#shared/campaign'

definePageMeta({ middleware: 'admin' })

const cid = Number(useRoute().params.cid)
const [{ data: loaded }, { data: session }] = await Promise.all([
  useAsyncData(`campaign-${cid}`, () => useRequestFetch()<AdminCampaign>(`/api/admin/c/${cid}`)),
  useAsyncData('session', () => useRequestFetch()<SessionInfo>('/api/admin/session')),
])
if (!loaded.value) throw createError({ statusCode: 404, message: 'Campaign not found.', fatal: true })

const campaign = ref(loaded.value) as Ref<AdminCampaign>
const isOwner = session.value?.role === 'owner'
provide(campaignAdminKey, { campaign, api: `/api/admin/c/${cid}`, isOwner, update: next => (campaign.value = next) })

useHead(() => ({ title: campaignName(campaign.value), htmlAttrs: { lang: 'en', dir: 'ltr', class: '' } }))

const tabs = [
  { id: 'guests', to: `/admin/c/${cid}`, label: 'Guests' },
  { id: 'import', to: `/admin/c/${cid}/import`, label: 'Import' },
  { id: 'details', to: `/admin/c/${cid}/details`, label: 'Details' },
  { id: 'design', to: `/admin/c/${cid}/design`, label: 'Design' },
  { id: 'settings', to: `/admin/c/${cid}/settings`, label: 'Settings' },
]
/** Each section owns a colour; the band and the primary action take the current one. */
const route = useRoute()
const section = computed(() => tabs.find(t => t.to === route.path.replace(/\/$/, ''))?.id ?? 'guests')
const statusText = { draft: 'Draft: guests cannot open it yet', live: 'Live', archived: 'Archived' }
</script>

<template>
  <div class="admin" :class="`sec-${section}`">
    <header class="a-band">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 pt-4">
        <NuxtLink v-if="isOwner" class="a-btn a-btn-quiet a-btn-sm" to="/admin" aria-label="All campaigns">← Campaigns</NuxtLink>
        <h1 class="min-w-0 truncate"><bdi>{{ campaignName(campaign) }}</bdi></h1>
        <span class="a-tag">{{ statusText[campaign.status] }}</span>
        <span class="grow" />
        <a class="a-btn a-btn-sm" :href="campaign.previewUrl" target="_blank" rel="noopener">{{ campaign.status === 'draft' ? 'Preview' : 'View invitation' }}</a>
        <button class="a-btn a-btn-quiet a-btn-sm" type="button" @click="signOut">Sign out</button>
      </div>
      <nav class="a-tabs mx-auto mt-3 max-w-7xl px-4" aria-label="Campaign sections">
        <NuxtLink v-for="tab in tabs" :key="tab.id" :to="tab.to" class="a-tab" :class="[`a-tab-${tab.id}`, { 'is-current': section === tab.id }]" :aria-current="section === tab.id ? 'page' : undefined">{{ tab.label }}</NuxtLink>
      </nav>
    </header>
    <main class="mx-auto max-w-7xl px-4 pb-20">
      <NuxtPage />
    </main>
  </div>
</template>
