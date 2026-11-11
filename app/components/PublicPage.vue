<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'

/** The read-only invitation for one campaign. `slug` empty means "the campaign of this hostname". */
const props = defineProps<{ slug?: string }>()
const route = useRoute()
const { m, configure } = useI18n()

const { data: campaign, error } = await useAsyncData(`site-${props.slug ?? 'host'}`, () =>
  useRequestFetch()<PublicCampaign>('/api/site', { query: { slug: props.slug, draft: route.query.draft } }))

if (campaign.value) configure(campaign.value.content.languages)
else {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}
const notOpen = computed(() => (error.value?.data as { data?: { code?: string } } | undefined)?.data?.code === 'not_open')
</script>

<template>
  <CampaignSite v-if="campaign" :campaign="campaign" :invitation="null" />
  <SiteNotice v-else-if="notOpen" :title="m.notOpen.title" :body="m.notOpen.body" />
  <SiteNotice v-else :title="m.invalid.title" />
</template>
