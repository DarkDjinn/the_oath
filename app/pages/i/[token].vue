<script setup lang="ts">
import type { GuestInvitation, PhotoInfo } from '#shared/types'
import { braidArt } from '~/utils/ornament'

/** A guest's personal invitation. The token in the URL is their only credential. */
const token = useRoute().params.token as string
const { m, lang, dir, useDefault } = useI18n()

const { data: photos } = await useFetch<PhotoInfo>('/api/photos', { default: () => ({ hero: null, second: null }) })
const { data: invitation, error } = await useAsyncData('invitation', () =>
  $fetch<GuestInvitation>('/api/rsvp', { headers: { authorization: `Bearer ${token}` } }))

if (invitation.value) useDefault(invitation.value.language)
else {
  const status = error.value?.statusCode === 429 ? 429 : 404
  const event = useRequestEvent()
  if (event) setResponseStatus(event, status)
  useHead(() => ({ htmlAttrs: { lang: lang.value, dir: dir.value }, title: m.value.invalid.title }))
}
</script>

<template>
  <InvitationView v-if="invitation" :invitation="invitation" :token="token" :photos="photos" @update="invitation = $event" />
  <main v-else class="inv invalid">
    <OrnamentArt :art="braidArt" class="invalid-rule" />
    <h1>{{ error?.statusCode === 429 ? m.errors.rateLimited : m.invalid.title }}</h1>
    <p v-if="error?.statusCode !== 429">{{ m.invalid.body }}</p>
  </main>
</template>

<style scoped>
.invalid { min-height: 100svh; display: grid; place-content: center; justify-items: center; gap: 0.75rem; padding: 2rem 1.5rem; text-align: center; }
.invalid-rule { width: 13rem; margin-bottom: 1rem; }
.invalid h1 { font-size: clamp(1.9rem, 8vw, 2.5rem); font-weight: 700; line-height: 1.2; }
.invalid p { max-width: 26rem; color: var(--color-mute); text-wrap: pretty; }
</style>
