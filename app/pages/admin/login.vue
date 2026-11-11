<script setup lang="ts">
useHead({ title: 'Sign in', htmlAttrs: { lang: 'en', dir: 'ltr' } })

/** Couples can be sent `/admin/login?c=<their address>` so the first field is already filled in. */
const username = ref(typeof useRoute().query.c === 'string' ? useRoute().query.c as string : '')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function signIn() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await $fetch<{ role: string, campaignId: number | null }>('/api/admin/login', { method: 'POST', body: { username: username.value, password: password.value } })
    await navigateTo(result.campaignId ? `/admin/c/${result.campaignId}` : '/admin')
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
    <form class="a-panel login w-full max-w-sm overflow-hidden" @submit.prevent="signIn">
      <div class="a-band px-6 py-5">
        <h1>Sign in</h1>
        <p class="mt-0.5 opacity-85">Manage your invitation and guest list.</p>
      </div>
      <div class="p-6 pt-1">
      <label class="a-label mt-5" for="username">Sign-in name</label>
      <input id="username" v-model="username" class="a-field" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="your campaign address" required>
      <p class="muted mt-1 text-[0.8125rem]">Couples use their campaign address, for example dana-and-omer.</p>
      <label class="a-label mt-4" for="password">Password</label>
      <input id="password" v-model="password" class="a-field" type="password" autocomplete="current-password" required>
      <p v-if="error" class="mt-3 text-danger" role="alert">{{ error }}</p>
      <button class="a-btn a-btn-primary mt-5 w-full" type="submit" :disabled="busy || !password || !username">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
      </div>
    </form>
  </main>
</template>

<style scoped>
.login { box-shadow: 0 16px 40px -18px rgb(21 27 46 / 0.3); }
</style>
