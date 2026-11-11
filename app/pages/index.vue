<script setup lang="ts">
/**
 * On a campaign's subdomain this is that couple's public invitation.
 * On the platform's own address it is a plain front door for the people who manage invitations.
 */
const { data: host } = await useAsyncData('host', () => useRequestFetch()<{ slug: string | null, unknown: boolean }>('/api/host'))
const { m } = useI18n()
if (host.value?.unknown) {
  const event = useRequestEvent()
  if (event) setResponseStatus(event, 404)
}
else if (!host.value?.slug) useHead({ title: 'Invitations', htmlAttrs: { lang: 'en', dir: 'ltr' } })
</script>

<template>
  <PublicPage v-if="host?.slug" />
  <SiteNotice v-else-if="host?.unknown" :title="m.invalid.title" />
  <main v-else class="admin grid place-items-center p-6 text-center">
    <div>
      <h1>Invitations</h1>
      <p class="muted mt-2 max-w-sm">Guests reach their invitation through the personal link they received.</p>
      <NuxtLink class="a-btn mt-6" to="/admin">Sign in to manage a campaign</NuxtLink>
    </div>
  </main>
</template>
