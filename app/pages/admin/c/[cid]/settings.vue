<script setup lang="ts">
import type { AdminCampaign, CampaignStatus } from '#shared/campaign'
import { directionOf, LANGUAGE_NAMES, MAX_EXTRA_GUESTS } from '#shared/types'

const { campaign, api, isOwner, update } = useCampaignAdmin()
const notice = ref('')
const errors = reactive<Record<string, string>>({})
const busy = ref('')

async function run(key: string, action: () => Promise<AdminCampaign | undefined>, done: string) {
  if (busy.value) return
  busy.value = key
  errors[key] = ''
  notice.value = ''
  try {
    const next = await action()
    if (next) update(next)
    notice.value = done
  }
  catch (e) { errors[key] = apiError(e) }
  finally { busy.value = '' }
}

// ------------------------------------------------------------------- RSVP
const rsvp = reactive({ ...campaign.value.content.rsvp, rsvpBy: campaign.value.content.rsvpBy })
const saveRsvp = () => run('rsvp', () => {
  const { rsvpBy, ...rest } = rsvp
  return adminFetch<AdminCampaign>(`${api}/content`, { method: 'PUT', body: { ...campaign.value.content, rsvpBy, rsvp: rest } })
}, 'Reply settings saved.')

// --------------------------------------------------------------- WhatsApp
const whatsapp = reactive({ ...campaign.value.whatsapp })
const saveWhatsapp = () => run('whatsapp', () => adminFetch<AdminCampaign>(`${api}/whatsapp`, { method: 'PUT', body: whatsapp }), 'Messages saved.')

// ------------------------------------------------------------ owner tools
const statuses: { id: CampaignStatus, label: string, hint: string }[] = [
  { id: 'draft', label: 'Draft', hint: 'Only signed-in admins can see the invitation. Links show "not open yet".' },
  { id: 'live', label: 'Live', hint: 'Guests can open their links and reply.' },
  { id: 'archived', label: 'Archived', hint: 'The invitation stays readable, replies are closed, and the address is released from HTTPS.' },
]
const setStatus = (status: CampaignStatus) => run('status', () => adminFetch<AdminCampaign>(api, { method: 'PATCH', body: { status } }), `The campaign is now ${status}.`)

const slug = ref(campaign.value.slug)
const saveSlug = () => {
  if (!window.confirm(`Change the address to "${slug.value}"?\n\nLinks you have not sent yet will use the new address. Links already sent keep working. The couple's sign-in name changes too.`)) return
  return run('slug', () => adminFetch<AdminCampaign>(api, { method: 'PATCH', body: { slug: slug.value } }), 'Address changed.')
}

const credentials = ref<{ username: string, password: string } | null>(null)
const copied = ref(false)
async function issuePassword() {
  if (campaign.value.hasPassword && !window.confirm('Issue a new password? The current one stops working and the couple is signed out.')) return
  await run('password', async () => {
    credentials.value = await adminFetch<{ username: string, password: string }>(`${api}/password`, { method: 'POST' })
    copied.value = false
    return adminFetch<AdminCampaign>(api)
  }, 'New password issued. It is shown once, below.')
}
const loginUrl = computed(() => `${window.location.origin}/admin/login?c=${campaign.value.slug}`)
async function copyCredentials() {
  if (!credentials.value) return
  copied.value = await copyText(`Sign in: ${loginUrl.value}\nCampaign address: ${credentials.value.username}\nPassword: ${credentials.value.password}`)
}

const confirmSlug = ref('')
const remove = () => run('delete', async () => {
  await adminFetch(api, { method: 'DELETE', body: { confirm: confirmSlug.value } })
  await navigateTo('/admin')
  return undefined
}, '')
</script>

<template>
  <div class="max-w-3xl">
    <p v-if="notice" class="a-panel mt-6 px-4 py-2" role="status">{{ notice }}</p>

    <form class="mt-6" @submit.prevent="saveRsvp">
      <h2>Replies</h2>
      <div class="mt-3 grid gap-3 sm:grid-cols-2">
        <label><span class="a-label">Reply-by date <span class="muted font-normal">(optional)</span></span><input v-model="rsvp.rsvpBy" class="a-field" type="date"></label>
        <label><span class="a-label">Guests an invitee may bring, at most</span><input v-model.number="rsvp.guestLimit" class="a-field num" type="number" min="1" :max="MAX_EXTRA_GUESTS" required></label>
      </div>
      <p class="muted mt-1 text-[0.8125rem]">Every invitee may bring guests up to this limit. Set 1 for a plus-one. An invitee can be given their own limit, or 0, in the guest list.</p>
      <div class="mt-4 grid gap-2">
        <label class="flex items-center gap-2"><input v-model="rsvp.askDietary" type="checkbox" class="size-4 accent-[var(--a-sec-text)]">Ask about dietary and accessibility needs</label>
        <label class="flex items-center gap-2"><input v-model="rsvp.askMessage" type="checkbox" class="size-4 accent-[var(--a-sec-text)]">Let guests write a few words to the couple</label>
        <label class="flex items-center gap-2"><input v-model="rsvp.closeAfterDeadline" type="checkbox" class="size-4 accent-[var(--a-sec-text)]" :disabled="!rsvp.rsvpBy">Close replies automatically after the reply-by date</label>
        <label class="flex items-center gap-2"><input v-model="rsvp.closed" type="checkbox" class="size-4 accent-[var(--a-sec-text)]">Close replies now <span class="muted">(the invitation stays visible)</span></label>
      </div>
      <p v-if="errors.rsvp" class="mt-3 text-danger" role="alert">{{ errors.rsvp }}</p>
      <button class="a-btn a-btn-primary mt-4" type="submit" :disabled="busy === 'rsvp'">Save reply settings</button>
    </form>

    <form class="mt-10" @submit.prevent="saveWhatsapp">
      <h2>WhatsApp messages</h2>
      <p class="muted mt-1"><code>{name}</code> becomes the guest's name and <code>{link}</code> their personal link. Nothing is sent automatically.</p>
      <template v-for="l in campaign.content.languages" :key="l">
        <label class="a-label mt-3" :for="`wa-${l}`">For {{ LANGUAGE_NAMES[l] }} invitations</label>
        <textarea :id="`wa-${l}`" v-model="whatsapp[l]" class="a-field" rows="5" :dir="directionOf(l)" :lang="l" />
      </template>
      <p v-if="errors.whatsapp" class="mt-3 text-danger" role="alert">{{ errors.whatsapp }}</p>
      <button class="a-btn a-btn-primary mt-4" type="submit" :disabled="busy === 'whatsapp'">Save messages</button>
    </form>

    <section id="whatsapp" class="mt-10 scroll-mt-4">
      <h2>Sending from your own WhatsApp</h2>
      <p class="muted mt-1">Link a WhatsApp account once, and the guest list can send every invitation for you from that number, a few each minute.</p>
      <p class="mt-2 rounded-md bg-[var(--a-wait-bg)] px-3 py-2 text-[var(--a-wait-ink)]">This works like WhatsApp Web and is not an official WhatsApp feature. WhatsApp may limit an account it believes is sending in bulk. Sending to people who have your number saved, at this slow pace, keeps that unlikely.</p>
      <WhatsappLink class="mt-4" :api="api" />
    </section>

    <template v-if="isOwner">
      <section class="mt-10">
        <h2>Status</h2>
        <div class="mt-3 grid gap-2">
          <button v-for="s in statuses" :key="s.id" type="button" class="status" :class="{ 'is-on': campaign.status === s.id }" :aria-pressed="campaign.status === s.id" :disabled="!!busy" @click="setStatus(s.id)">
            <span class="font-semibold">{{ s.label }}</span><span class="muted block text-[0.8125rem]">{{ s.hint }}</span>
          </button>
        </div>
        <p v-if="errors.status" class="mt-3 text-danger" role="alert">{{ errors.status }}</p>
      </section>

      <section class="mt-10">
        <h2>The couple's sign-in</h2>
        <p class="muted mt-1">{{ campaign.hasPassword ? 'The couple can sign in and manage this campaign.' : 'No password has been issued yet, so only you can manage this campaign.' }}</p>
        <button class="a-btn mt-3" type="button" :disabled="busy === 'password'" @click="issuePassword">{{ campaign.hasPassword ? 'Issue a new password' : 'Create the couple\'s password' }}</button>
        <p v-if="errors.password" class="mt-3 text-danger" role="alert">{{ errors.password }}</p>
        <div v-if="credentials" class="a-panel mt-3 p-4">
          <p class="font-semibold">Give these to the couple now. The password cannot be shown again.</p>
          <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
            <dt class="muted">Sign in at</dt><dd class="break-all">{{ loginUrl }}</dd>
            <dt class="muted">Campaign address</dt><dd>{{ credentials.username }}</dd>
            <dt class="muted">Password</dt><dd class="num font-semibold">{{ credentials.password }}</dd>
          </dl>
          <button class="a-btn a-btn-sm mt-3" type="button" @click="copyCredentials">{{ copied ? 'Copied' : 'Copy all three' }}</button>
        </div>
      </section>

      <form class="mt-10" @submit.prevent="saveSlug">
        <h2>Address</h2>
        <p class="muted mt-1">Currently <span class="break-all text-[var(--a-ink)]">{{ campaign.siteUrl }}</span></p>
        <div class="mt-3 flex flex-wrap gap-2">
          <input v-model="slug" class="a-field max-w-xs" aria-label="Campaign address" required minlength="3" maxlength="40" autocapitalize="none" spellcheck="false">
          <button class="a-btn" type="submit" :disabled="busy === 'slug' || slug === campaign.slug">Change address</button>
        </div>
        <p v-if="errors.slug" class="mt-3 text-danger" role="alert">{{ errors.slug }}</p>
      </form>

      <form class="mt-10 rounded-lg border border-[var(--a-no-line)] p-4" @submit.prevent="remove">
        <h2>Delete this campaign</h2>
        <p class="muted mt-1">Removes the invitation, every guest, every reply, the photos and the couple's sign-in. Export the guest list first if it may be needed. This cannot be undone.</p>
        <label class="a-label mt-3" for="confirm-slug">Type <span class="num text-[var(--a-ink)]">{{ campaign.slug }}</span> to confirm</label>
        <div class="flex flex-wrap gap-2">
          <input id="confirm-slug" v-model="confirmSlug" class="a-field max-w-xs" autocomplete="off" autocapitalize="none" spellcheck="false">
          <button class="a-btn a-btn-danger" type="submit" :disabled="confirmSlug !== campaign.slug || busy === 'delete'">Delete campaign</button>
        </div>
        <p v-if="errors.delete" class="mt-3 text-danger" role="alert">{{ errors.delete }}</p>
      </form>
    </template>
  </div>
</template>

<style scoped>
.status { padding: 0.7rem 0.9rem; border: 1px solid var(--a-line-strong); border-radius: 8px; background: none; text-align: left; cursor: pointer; }
.status:hover { border-color: var(--a-line-hover); }
.status.is-on { border-color: var(--a-sec-text); background: var(--a-sec-tint); box-shadow: inset 0 0 0 1px var(--a-sec-text); }
</style>
