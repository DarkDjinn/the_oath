<script setup lang="ts">
import type { LinkStatus } from '#shared/types'

/**
 * Link, check or unlink one WhatsApp account: a campaign's own (`api` is its admin base path)
 * or the platform's shared account (no `api`; owner only).
 */
const props = defineProps<{ api?: string }>()
const emit = defineEmits<{ change: [LinkStatus] }>()

const statusUrl = props.api ? `${props.api}/whatsapp` : '/api/admin/whatsapp'
const linkUrl = props.api ? `${props.api}/whatsapp/link` : '/api/admin/whatsapp'
const status = ref<LinkStatus>({ state: 'unlinked' })
const error = ref('')
const busy = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

async function load() {
  clearTimeout(timer)
  try {
    const data = await adminFetch<LinkStatus | { own: LinkStatus }>(statusUrl)
    status.value = 'own' in data ? data.own : data
    emit('change', status.value)
  }
  catch (e) { error.value = apiError(e) }
  // While a code is waiting to be scanned, or a connection is coming up, keep looking.
  if (status.value.state === 'pairing' || status.value.state === 'connecting') timer = setTimeout(load, 2500)
}
async function link() {
  busy.value = true
  error.value = ''
  try {
    status.value = await adminFetch<LinkStatus>(linkUrl, { method: 'POST' })
    timer = setTimeout(load, 1500)
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}
async function unlink(ask = true) {
  if (ask && !window.confirm('Unlink this WhatsApp account? Automatic sending stops until an account is linked again.')) return
  busy.value = true
  try {
    await adminFetch(linkUrl, { method: 'DELETE' })
    await load()
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}
onMounted(load)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div>
    <template v-if="status.state === 'linked'">
      <p><span class="a-tag a-tag-attending">Linked</span> <span class="num ml-1 font-semibold">+{{ status.number }}</span></p>
      <button class="a-btn a-btn-sm mt-3" type="button" :disabled="busy" @click="unlink()">Unlink</button>
    </template>

    <template v-else-if="status.state === 'pairing' && status.qr">
      <div class="flex flex-wrap items-start gap-5">
        <img :src="status.qr" width="200" height="200" alt="QR code to link WhatsApp" class="rounded-md border border-[var(--a-line)] bg-white p-1">
        <ol class="max-w-xs list-decimal space-y-1 pl-5">
          <li>Open WhatsApp on the phone that will send the invitations.</li>
          <li>Go to <b>Settings → Linked devices → Link a device</b>.</li>
          <li>Point the phone at this code.</li>
        </ol>
      </div>
      <p class="muted mt-2 text-[0.8125rem]" role="status">Waiting for the scan. The code refreshes by itself and expires after about a minute.</p>
      <button class="a-btn a-btn-sm mt-3" type="button" :disabled="busy" @click="unlink(false)">Cancel</button>
    </template>

    <p v-else-if="status.state === 'connecting'" class="muted" role="status">Connecting to WhatsApp…</p>

    <template v-else>
      <button class="a-btn" type="button" :disabled="busy" @click="link">{{ busy ? 'Starting…' : 'Link a WhatsApp account' }}</button>
    </template>

    <p v-if="error" class="mt-3 text-danger" role="alert">{{ error }}</p>
  </div>
</template>
