<script setup lang="ts">
/** A campaign's public page by path: the fallback when subdomains are not in use, and the admin's design preview. */
const slug = useRoute().params.slug as string
</script>

<template>
  <PublicPage :slug="slug" />
</template>
