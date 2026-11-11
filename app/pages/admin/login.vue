<script setup lang="ts">
useHead({ title: 'Sign in', htmlAttrs: { lang: 'en', dir: 'ltr' } })

const password = ref('')
const error = ref('')
const busy = ref(false)

async function signIn() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    await navigateTo('/admin')
  }
  catch (e) {
    error.value = apiError(e)
    password.value = ''
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <main class="admin grid place-items-center p-4">
    <form class="a-panel w-full max-w-sm p-6" @submit.prevent="signIn">
      <h1>Guest list</h1>
      <p class="muted mt-1">Sign in to manage invitations.</p>
      <label class="a-label mt-5" for="password">Password</label>
      <input id="password" v-model="password" class="a-field" type="password" autocomplete="current-password" required autofocus>
      <p v-if="error" class="mt-3 text-danger" role="alert">{{ error }}</p>
      <button class="a-btn a-btn-primary mt-5 w-full" type="submit" :disabled="busy || !password">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>
  </main>
</template>
