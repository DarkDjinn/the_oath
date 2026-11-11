<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'
import { themeComponents } from '~/themes'

/** Renders a campaign in its chosen theme, with the owner's custom CSS when there is any. */
const props = defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
defineEmits<{ update: [GuestInvitation] }>()

const theme = computed(() => themeComponents[props.campaign.design.theme] ?? themeComponents.nocturne!)
useHead(() => ({
  style: props.campaign.design.customCss ? [{ key: 'campaign-css', innerHTML: props.campaign.design.customCss }] : [],
}))
</script>

<template>
  <component :is="theme" :campaign="campaign" :invitation="invitation" :token="token" @update="$emit('update', $event)" />
</template>
