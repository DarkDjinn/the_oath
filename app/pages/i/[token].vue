<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'

/** A guest's personal invitation. The token in the URL is their only credential, on any hostname. */
const token = useRoute().params.token as string
const { m, configure } = useI18n()

const { data, error } = await useAsyncData('invitation', () =>
  useRequestFetch()<{ invitation: GuestInvitation, campaign: PublicCampaign }>('/api/rsvp', { headers: { authorization: `Bearer ${token}` } }))

if (data.value) configure(data.value.campaign.content.languages, data.value.invitation.language)
else {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, error.value?.statusCode === 429 ? 429 : 404)
}
const reason = computed(() => (error.value?.data as { data?: { code?: string } } | undefined)?.data?.code)
</script>

<template>
  <CampaignSite v-if="data" :campaign="data.campaign" :invitation="data.invitation" :token="token" @update="data.invitation = $event" />
  <SiteNotice v-else-if="error?.statusCode === 429" :title="m.errors.rateLimited" />
  <SiteNotice v-else-if="reason === 'not_open'" :title="m.notOpen.title" :body="m.notOpen.body" />
  <SiteNotice v-else :title="m.invalid.title" :body="m.invalid.body" />
</template>
