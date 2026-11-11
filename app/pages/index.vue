<script setup lang="ts">
import type { PhotoInfo } from '#shared/types'

/** The public invitation: everything except a personal greeting and the RSVP form. */
const { data: photos } = await useFetch<PhotoInfo>('/api/photos', { default: () => ({ hero: null, second: null }) })
</script>

<template>
  <InvitationView :invitation="null" :photos="photos" />
</template>
