<script setup lang="ts">
import type { NuxtError } from '#app'

/** The page for anything that goes wrong outside an invitation: a wrong address, a missing campaign, a server fault. */
const props = defineProps<{ error: NuxtError }>()
const missing = computed(() => props.error.statusCode === 404)
useHead({ title: missing.value ? 'Not found' : 'Something went wrong', htmlAttrs: { lang: 'en', dir: 'ltr' } })
</script>

<template>
  <main class="admin grid place-items-center p-6 text-center">
    <div>
      <h1>{{ missing ? 'This page does not exist' : 'Something went wrong' }}</h1>
      <p class="muted mt-2 max-w-sm">{{ missing ? 'The address may be mistyped, or the page may have been removed.' : 'Please try again in a moment.' }}</p>
      <button class="a-btn mt-6" type="button" @click="clearError({ redirect: '/' })">Go to the start page</button>
    </div>
  </main>
</template>
