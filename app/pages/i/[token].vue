<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'

/** A guest's personal invitation. The token in the URL is their only credential, on any hostname. */
const token = useRoute().params.token as string
const { m, configure } = useI18n()

const { data, error } = await useAsyncData('invitation', () =>
  useRequestFetch()<{ invitation: GuestInvitation, campaign: PublicCampaign, adminView?: boolean }>('/api/rsvp', { headers: { authorization: `Bearer ${token}` } }))

if (data.value) configure(data.value.campaign.content.languages, data.value.invitation.language)
else {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, error.value?.statusCode === 429 ? 429 : 404)
}
/** `data` is a shallow ref: replace it whole, or the page keeps showing the old answer until a reload. */
function saved(invitation: GuestInvitation) {
  if (data.value) data.value = { ...data.value, invitation }
}
const reason = computed(() => (error.value?.data as { data?: { code?: string } } | undefined)?.data?.code)
</script>

<template>
  <div v-if="data">
    <CampaignSite :campaign="data.campaign" :invitation="data.invitation" :token="token" @update="saved" />
    <!-- Only the couple or the owner ever see this: their own visit is not the guest's. -->
    <p v-if="data.adminView" class="admin-view" lang="en" dir="ltr">You are signed in to the admin, so this visit is not recorded as the guest opening the link.</p>
  </div>
  <SiteNotice v-else-if="error?.statusCode === 429" :title="m.errors.rateLimited" />
  <SiteNotice v-else-if="reason === 'not_open'" :title="m.notOpen.title" :body="m.notOpen.body" />
  <SiteNotice v-else :title="m.invalid.title" :body="m.invalid.body" />
</template>

<style scoped>
.admin-view {
  position: fixed; inset-inline: 0; bottom: 0; z-index: 50; margin: 0;
  padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
  background: #14213d; color: #fff; font: 600 0.8125rem/1.4 system-ui, sans-serif; text-align: center;
}
</style>
