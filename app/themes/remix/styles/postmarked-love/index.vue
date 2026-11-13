<script setup lang="ts">
import type { PublicCampaign } from '#shared/campaign'
import type { GuestInvitation } from '#shared/types'
import RemixPage from '../../RemixPage.vue'
import * as art from './art'
import { extra } from './options'
import './style.css'
import './extra.css'

/**
 * Postmarked Love / Air Mail. The hero is art.ts (generated from the design's SVG), the option choices are
 * options.ts (drawings) and extra.css (what they hide, frames, buttons), the placing and
 * dressing style.css (generated from the design) and extra.css.
 */
defineOptions({ name: 'PostmarkedLoveInvitation' })
const props = defineProps<{ campaign: PublicCampaign, invitation: GuestInvitation | null, token?: string }>()
defineEmits<{ update: [GuestInvitation] }>()
const drawn = computed(() => extra(props.campaign.design.options))
</script>

<template>
  <RemixPage :campaign="campaign" :invitation="invitation" :token="token" :art="art" :extra="drawn" tag="SPECIAL DELIVERY • WITH LOVE" @update="$emit('update', $event)" />
</template>
