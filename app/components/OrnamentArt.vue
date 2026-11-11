<script setup lang="ts">
import type { Art } from '~/utils/ornament'

/** Renders one piece of generated engraving. Purely decorative. */
defineProps<{ art: Art }>()
</script>

<template>
  <svg class="orn" :viewBox="art.viewBox" aria-hidden="true" focusable="false" v-html="art.body" />
</template>
