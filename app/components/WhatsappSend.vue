<script setup lang="ts">
import type { LinkStatus, SendProgress } from '#shared/types'

/** The "send to everyone" dialog: choose the sending account, start, watch progress, stop. */
const props = defineProps<{ api: string, campaignId: number, live: boolean }>()
const emit = defineEmits<{ changed: [] }>()

interface Overview {
  own: LinkStatus
  platform: LinkStatus
  ready: number
  withoutPhone: number
  failed: number
  progress: SendProgress
  remainingToday: { own: number, platform: number }
}
const dialog = ref<HTMLDialogElement>()
const data = ref<Overview | null>(null)
const sender = ref<'own' | 'platform'>('own')
const error = ref('')
const busy = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const running = computed(() => data.value?.progress.state === 'running')
const canSend = computed(() => !!data.value && data.value[sender.value].state === 'linked' && data.value.ready > 0 && props.live)
const willSend = computed(() => Math.min(data.value?.ready ?? 0, data.value?.remainingToday[sender.value] ?? 0))
const minutes = computed(() => Math.max(1, Math.round(willSend.value * 30 / 60)))

async function load() {
  clearTimeout(timer)
  try {
    const before = data.value?.progress.sent ?? 0
    data.value = await adminFetch<Overview>(`${props.api}/whatsapp`)
    if (data.value.progress.sent !== before || data.value.progress.state !== 'running') emit('changed')
    if (running.value) timer = setTimeout(load, 3000)
  }
  catch (e) { error.value = apiError(e) }
}
async function open() {
  error.value = ''
  dialog.value?.showModal()
  await load()
  // Prefer the couple's own account; fall back to the shared one when only that is linked.
  if (data.value && data.value.own.state !== 'linked' && data.value.platform.state === 'linked') sender.value = 'platform'
}
const stopPolling = () => clearTimeout(timer)
function close() {
  clearTimeout(timer)
  dialog.value?.close()
}
async function start() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await adminFetch(`${props.api}/whatsapp/send`, { method: 'POST', body: { sender: sender.value } })
    await load()
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}
async function stop() {
  await adminFetch(`${props.api}/whatsapp/send`, { method: 'DELETE' })
  await load()
}
onBeforeUnmount(() => clearTimeout(timer))
defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="a-dialog" @click.self="close" @close="stopPolling">
    <div class="p-5">
      <h2>Send invitations by WhatsApp</h2>

      <p v-if="!data" class="muted mt-3" role="status">Loading…</p>

      <!-- A run is going, or has just ended -->
      <template v-else-if="data.progress.state !== 'idle'">
        <p class="mt-3 text-[1.0625rem]">
          <b class="num">{{ data.progress.sent }}</b> of <b class="num">{{ data.progress.total }}</b> sent<span v-if="data.progress.failed">, <b class="num text-danger">{{ data.progress.failed }}</b> could not be sent</span>.
        </p>
        <div class="bar mt-2" role="progressbar" :aria-valuenow="data.progress.sent + data.progress.failed" :aria-valuemax="data.progress.total"><i :style="{ width: `${data.progress.total ? (data.progress.sent + data.progress.failed) / data.progress.total * 100 : 100}%` }" /></div>
        <p v-if="running" class="muted mt-3" role="status">Sending slowly, one message about every half minute, so the account is not mistaken for spam. You can close this window; sending continues.</p>
        <p v-else-if="data.progress.state === 'done'" class="mt-3" role="status">Finished. Each guest is marked as sent in the list.</p>
        <p v-else class="mt-3 text-warn" role="status">{{ data.progress.reason }}</p>
        <p v-if="data.progress.failed" class="muted mt-2">Guests that failed show the reason under their name in the list.</p>
        <div class="mt-6 flex justify-end gap-2">
          <button v-if="running" class="a-btn a-btn-danger" type="button" @click="stop">Stop sending</button>
          <button v-else-if="data.ready" class="a-btn" type="button" @click="data.progress.state = 'idle'">Send the rest…</button>
          <button class="a-btn a-btn-primary" type="button" @click="close">Close</button>
        </div>
      </template>

      <!-- Ready to start -->
      <template v-else>
        <p class="mt-3">
          <b class="num">{{ data.ready }}</b> {{ data.ready === 1 ? 'guest has' : 'guests have' }} a phone number and no invitation yet.
          <span v-if="data.withoutPhone" class="muted">{{ data.withoutPhone }} without a phone number will be skipped; send those by hand.</span>
        </p>
        <p v-if="!live" class="mt-3 text-warn">The campaign is not live yet, so guests could not open their link. Ask the owner to take it live first.</p>

        <fieldset class="mt-4">
          <legend class="a-label">Send from</legend>
          <label class="option" :class="{ 'is-on': sender === 'own', 'is-off': data.own.state !== 'linked' }">
            <input v-model="sender" type="radio" value="own" :disabled="data.own.state !== 'linked'">
            <span><b>Our own WhatsApp</b><br>
              <span v-if="data.own.state === 'linked'" class="muted num">+{{ data.own.number }}</span>
              <span v-else class="muted">Not linked yet. <NuxtLink class="underline" :to="`/admin/c/${campaignId}/settings#whatsapp`" @click="close">Link it in Settings</NuxtLink>.</span>
            </span>
          </label>
          <label class="option mt-2" :class="{ 'is-on': sender === 'platform', 'is-off': data.platform.state !== 'linked' }">
            <input v-model="sender" type="radio" value="platform" :disabled="data.platform.state !== 'linked'">
            <span><b>The service's WhatsApp</b><br>
              <span v-if="data.platform.state === 'linked'" class="muted">Guests receive it from <span class="num">+{{ data.platform.number }}</span>, a number they may not know.</span>
              <span v-else class="muted">Not available at the moment.</span>
            </span>
          </label>
        </fieldset>

        <p v-if="canSend" class="muted mt-4">
          {{ willSend }} {{ willSend === 1 ? 'message' : 'messages' }} will go out over about {{ minutes }} {{ minutes === 1 ? 'minute' : 'minutes' }}.
          <span v-if="willSend < data.ready">The account can send {{ data.remainingToday[sender] }} more today; the rest can go tomorrow.</span>
        </p>
        <p v-if="error" class="mt-3 text-danger" role="alert">{{ error }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="a-btn" type="button" @click="close">Cancel</button>
          <button class="a-btn a-btn-primary" type="button" :disabled="!canSend || busy" @click="start">{{ busy ? 'Starting…' : `Send to ${willSend}` }}</button>
        </div>
      </template>
    </div>
  </dialog>
</template>

<style scoped>
.option { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.7rem 0.9rem; border: 1px solid var(--a-line-strong); border-radius: 8px; cursor: pointer; }
.option input { margin-top: 0.3rem; }
.option.is-on { border-color: var(--a-sec-text); background: var(--a-sec-tint); box-shadow: inset 0 0 0 1px var(--a-sec-text); }
.option.is-off { cursor: default; background: var(--a-tint); }
.bar { height: 0.6rem; border-radius: 999px; background: var(--a-tint); overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--a-ok); transition: width 0.4s ease; }
</style>
