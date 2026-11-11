<script setup lang="ts">
import { braidArt } from '~/utils/ornament'

/** A quiet full-page message: an invalid link, an invitation that is not open yet, and so on. */
defineProps<{ title: string, body?: string }>()
const { lang, dir } = useI18n()
useHead(() => ({ htmlAttrs: { lang: lang.value, dir: dir.value } }))
</script>

<template>
  <main class="inv notice">
    <OrnamentArt :art="braidArt" class="notice-rule" />
    <h1>{{ title }}</h1>
    <p v-if="body">{{ body }}</p>
  </main>
</template>

<style scoped>
.notice { min-height: 100svh; display: grid; place-content: center; justify-items: center; gap: 0.75rem; padding: 2rem 1.5rem; text-align: center; }
.notice-rule { width: 13rem; margin-bottom: 1rem; }
.notice h1 { font-size: clamp(1.9rem, 8vw, 2.5rem); font-weight: 700; line-height: 1.2; }
.notice p { max-width: 26rem; color: var(--color-mute); text-wrap: pretty; }
</style>
