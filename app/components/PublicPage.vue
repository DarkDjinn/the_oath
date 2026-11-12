<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import { normaliseDesign } from '#shared/themes'
import { isLanguage, type GuestInvitation } from '#shared/types'
import { PREVIEW_TOKEN, sampleGuest } from '~/utils/preview'

/** The read-only invitation for one campaign. `slug` empty means "the campaign of this hostname". */
const props = defineProps<{ slug?: string }>()
const route = useRoute()
const { m, lang, configure, setLang } = useI18n()

const { data: campaign, error } = await useAsyncData(`site-${props.slug ?? 'host'}`, () =>
  useRequestFetch()<PublicCampaign>('/api/site', { query: { slug: props.slug, draft: route.query.draft } }))

if (campaign.value) configure(campaign.value.content.languages)
else {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}
/**
 * Inside the design studio's preview frame, the studio sends each unsaved change and this page redraws at once.
 * Only the page that framed us, on our own origin, is listened to, and what it sends is validated like any saved design.
 */
function onStudioMessage(event: MessageEvent) {
  if (event.origin !== location.origin || event.source !== window.parent || event.data?.type !== 'oath-preview' || !campaign.value) return
  campaign.value = { ...campaign.value, design: normaliseDesign(event.data.design, campaign.value.slug, campaign.value.design) }
  if (isLanguage(event.data.lang)) setLang(event.data.lang)
}
/** In the studio the page shows a sample guest, so the buttons and the RSVP form can be seen as guests see them. */
const inStudio = ref(false)
const sample = ref<GuestInvitation | null>(null)
watch([inStudio, lang], () => {
  if (inStudio.value) sample.value = { ...sampleGuest(lang.value), ...(sample.value && { rsvpStatus: sample.value.rsvpStatus, extraGuests: sample.value.extraGuests, respondedAt: sample.value.respondedAt }) }
})
onMounted(() => {
  if (!route.query.draft || window.parent === window) return
  inStudio.value = true
  window.addEventListener('message', onStudioMessage)
  window.parent.postMessage({ type: 'oath-preview-ready' }, location.origin)
})
onBeforeUnmount(() => window.removeEventListener('message', onStudioMessage))

const notOpen = computed(() => (error.value?.data as { data?: { code?: string } } | undefined)?.data?.code === 'not_open')
</script>

<template>
  <CampaignSite v-if="campaign" :campaign="campaign" :invitation="sample" :token="sample ? PREVIEW_TOKEN : undefined" @update="sample = $event" />
  <SiteNotice v-else-if="notOpen" :title="m.notOpen.title" :body="m.notOpen.body" />
  <SiteNotice v-else :title="m.invalid.title" />
</template>
