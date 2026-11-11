<script setup lang="ts">
import { LANGUAGE_NAMES, LIMITS, MAX_EXTRA_GUESTS, type AdminInvitation, type InvitationEvent, type Language, type RsvpStatus, type Stats } from '#shared/types'

const { campaign, api } = useCampaignAdmin()
const { data, refresh } = await useAsyncData(`invitations-${campaign.value.id}`, () =>
  useRequestFetch()<{ invitations: AdminInvitation[], stats: Stats }>(`${api}/invitations`))

const invitations = computed(() => data.value?.invitations ?? [])
const stats = computed(() => data.value?.stats)

// ------------------------------------------------------------ list controls
const search = ref('')
const filter = ref('all')
const sort = ref('name')
const filters: Record<string, { label: string, test: (i: AdminInvitation) => boolean }> = {
  all: { label: 'All invitations', test: () => true },
  pending: { label: 'No response yet', test: i => i.rsvpStatus === 'pending' },
  attending: { label: 'Attending', test: i => i.rsvpStatus === 'attending' },
  declined: { label: 'Declined', test: i => i.rsvpStatus === 'declined' },
  unsent: { label: 'Not sent yet', test: i => !i.sentAt },
  nophone: { label: 'No phone number', test: i => !i.phone },
  sendfailed: { label: 'Could not be sent', test: i => !!i.sendError && !i.sentAt },
  unopened: { label: 'Sent, not opened', test: i => !!i.sentAt && !i.firstOpenedAt },
  seen: { label: 'Opened, no response', test: i => !!i.firstOpenedAt && i.rsvpStatus === 'pending' },
  chase: { label: 'Sent, no response', test: i => !!i.sentAt && i.rsvpStatus === 'pending' },
  bringing: { label: 'Bringing guests', test: i => i.extraGuests.length > 0 },
}
const statusOrder: Record<RsvpStatus, number> = { pending: 0, attending: 1, declined: 2 }
const sorters: Record<string, { label: string, by: (a: AdminInvitation, b: AdminInvitation) => number }> = {
  name: { label: 'Name', by: (a, b) => a.guestName.localeCompare(b.guestName, ['he', 'ru', 'en']) },
  status: { label: 'RSVP status', by: (a, b) => statusOrder[a.rsvpStatus] - statusOrder[b.rsvpStatus] },
  responded: { label: 'Latest response', by: (a, b) => (b.respondedAt ?? '').localeCompare(a.respondedAt ?? '') },
  created: { label: 'Newest first', by: (a, b) => b.id - a.id },
}
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return invitations.value
    .filter(i => filters[filter.value]!.test(i))
    .filter(i => !q || [i.guestName, ...i.extraGuests].some(n => n.toLowerCase().includes(q)))
    .sort((a, b) => sorters[sort.value]!.by(a, b) || a.guestName.localeCompare(b.guestName, ['he', 'ru', 'en']))
})

// ------------------------------------------------------------------ actions
const notice = ref('')
const failure = ref('')
let noticeTimer: ReturnType<typeof setTimeout> | undefined
function say(text: string) {
  notice.value = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 3500)
}
async function run<T>(action: () => Promise<T>, done?: string): Promise<T | undefined> {
  failure.value = ''
  try {
    const result = await action()
    await refresh()
    if (done) say(done)
    return result
  }
  catch (e) {
    failure.value = apiError(e)
  }
}
const patch = (id: number, body: Record<string, unknown>, done?: string) =>
  run(() => adminFetch<AdminInvitation>(`${api}/invitations/${id}`, { method: 'PATCH', body }), done)

async function copyLink(i: AdminInvitation) {
  say(await copyText(i.url) ? `Link for ${i.guestName} copied. It is not marked as sent.` : 'Could not copy. Select the link in Edit instead.')
}
// ------------------------------------------------------- create / edit form
const editor = ref<HTMLDialogElement>()
const editing = ref<AdminInvitation | null>(null)
const form = reactive({ guestName: '', phone: '', language: 'he' as Language, guestsAllowed: true, guestLimit: '' as number | '', rsvpStatus: 'pending' as RsvpStatus, extraGuests: '', dietaryNotes: '', sent: false })
const formError = ref('')
const saving = ref(false)

const history = ref<InvitationEvent[]>([])
const eventLabel: Record<InvitationEvent['kind'], string> = {
  created: 'Invitation created', opened: 'Guest opened the link', answered: 'Guest answered', edited: 'Edited by an admin', sent: 'Sent',
  send_failed: 'Could not be sent', unsent: 'Marked as not sent', link_replaced: 'Link replaced', link_revoked: 'Link revoked', link_restored: 'Link restored',
}
function openEditor(i: AdminInvitation | null) {
  editing.value = i
  history.value = []
  if (i) adminFetch<InvitationEvent[]>(`${api}/invitations/${i.id}/events`).then(e => (history.value = e)).catch(() => {})
  formError.value = ''
  Object.assign(form, i
    ? { guestName: i.guestName, phone: i.phone, language: i.language, guestsAllowed: i.guestsAllowed, guestLimit: i.guestsAllowed ? (i.ownGuestLimit ?? '') : 0, rsvpStatus: i.rsvpStatus, extraGuests: i.extraGuests.join('\n'), dietaryNotes: i.dietaryNotes, sent: !!i.sentAt }
    : { guestName: '', phone: '', language: campaign.value.content.languages[0] ?? 'he', guestsAllowed: true, guestLimit: '', rsvpStatus: 'pending', extraGuests: '', dietaryNotes: '', sent: false })
  editor.value?.showModal()
}
async function save() {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await adminFetch(`${api}/invitations/${editing.value.id}`, {
        method: 'PATCH',
        body: { ...form, guestsAllowed: undefined, extraGuests: form.guestLimit === 0 ? [] : form.extraGuests.split('\n').map(n => n.trim()).filter(Boolean) },
      })
      say(`Saved ${form.guestName}.`)
    }
    else {
      await adminFetch(`${api}/invitations`, { method: 'POST', body: { guestName: form.guestName, phone: form.phone, language: form.language, guestLimit: form.guestLimit } })
      say(`Invitation for ${form.guestName} created.`)
      sort.value = 'created'
    }
    await refresh()
    editor.value?.close()
  }
  catch (e) {
    formError.value = apiError(e)
  }
  finally {
    saving.value = false
  }
}

// ------------------------------------------------------- confirmation dialog
const confirmer = ref<HTMLDialogElement>()
const pending = ref<{ title: string, body: string, label: string, danger: boolean, action: () => Promise<unknown> } | null>(null)
function ask(p: NonNullable<typeof pending.value>) {
  pending.value = p
  confirmer.value?.showModal()
}
async function confirmAction() {
  await pending.value?.action()
  confirmer.value?.close()
  editor.value?.close()
}
const askDelete = (i: AdminInvitation) => ask({
  title: `Delete the invitation for ${i.guestName}?`,
  body: 'Their link stops working and their RSVP is removed from every count and export. This cannot be undone.',
  label: 'Delete invitation',
  danger: true,
  action: () => run(() => adminFetch(`${api}/invitations/${i.id}`, { method: 'DELETE' }), `Deleted ${i.guestName}.`),
})
const askRegenerate = (i: AdminInvitation) => ask({
  title: `Issue a new link for ${i.guestName}?`,
  body: 'The current link stops working immediately. Their RSVP is kept. You will need to send them the new link, so it is marked as not sent.',
  label: 'Issue new link',
  danger: true,
  action: () => run(() => adminFetch(`${api}/invitations/${i.id}/regenerate`, { method: 'POST' }), `New link issued for ${i.guestName}.`),
})
const askRevoke = (i: AdminInvitation) => ask({
  title: i.revoked ? `Restore the link for ${i.guestName}?` : `Revoke the link for ${i.guestName}?`,
  body: i.revoked ? 'The same link will work again.' : 'The link stops working until you restore it. Their RSVP is kept.',
  label: i.revoked ? 'Restore link' : 'Revoke link',
  danger: !i.revoked,
  action: () => run(() => adminFetch(`${api}/invitations/${i.id}/revoke`, { method: 'POST', body: { revoked: !i.revoked } }), i.revoked ? 'Link restored.' : 'Link revoked.'),
})

// ----------------------------------------------------------------- WhatsApp
const whatsapp = ref<HTMLDialogElement>()
const waFor = ref<AdminInvitation | null>(null)
const waText = ref('')
const waCopied = ref(false)
function openWhatsapp(i: AdminInvitation) {
  waFor.value = i
  waCopied.value = false
  waText.value = fill(campaign.value.whatsapp[i.language] ?? '{link}', { name: i.guestName, link: i.url })
  whatsapp.value?.showModal()
}
const waLink = computed(() => `https://wa.me/?text=${encodeURIComponent(waText.value)}`)
async function copyMessage() {
  waCopied.value = await copyText(waText.value)
}
async function markSentAndClose() {
  if (waFor.value) await patch(waFor.value.id, { sent: true }, `${waFor.value.guestName} marked as sent.`)
  whatsapp.value?.close()
}

const sender = ref<{ open: () => void }>()
const statusLabel: Record<RsvpStatus, string> = { pending: 'No response', attending: 'Attending', declined: 'Declined' }
</script>

<template>
  <div>
    <div>
      <!-- Counts: invitations and people are kept apart on purpose. -->
      <section v-if="stats" aria-label="Summary" class="a-panel summary mt-5 grid grid-cols-2 overflow-hidden sm:grid-cols-4">
        <div class="stat stat-lead">
          <p class="stat-label">Confirmed attendees</p>
          <p class="stat-value num">{{ stats.confirmedAttendees }}</p>
          <p>{{ stats.accepted }} invited + {{ stats.confirmedExtraGuests }} they are bringing</p>
        </div>
        <div class="stat"><p class="stat-label">Invited (links)</p><p class="stat-value num">{{ stats.invited }}</p><p>{{ stats.sent }} sent, {{ stats.opened }} opened</p></div>
        <div class="stat"><p class="stat-label">No response yet</p><p class="stat-value num">{{ stats.pending }}</p><p>{{ stats.accepted }} accepted, {{ stats.declined }} declined</p></div>
        <div class="stat">
          <p class="stat-label">If everyone pending comes</p>
          <p class="stat-value num">{{ stats.expectedIfAllPendingAttend }}<span v-if="stats.openEnded" title="Open-ended">+</span></p>
          <p v-if="stats.openEnded">No fixed maximum: {{ stats.openEnded }} {{ stats.openEnded === 1 ? 'invitee' : 'invitees' }} may still add guests</p>
          <p v-else>Maximum possible attendance</p>
        </div>
      </section>

      <!-- Everyone invited, as one bar: coming, waiting, not coming. -->
      <div v-if="stats && stats.invited" class="split mt-3" role="img" :aria-label="`${stats.accepted} accepted, ${stats.pending} waiting, ${stats.declined} declined`">
        <i class="split-ok" :style="{ flexGrow: stats.accepted }" /><i class="split-wait" :style="{ flexGrow: stats.pending }" /><i class="split-no" :style="{ flexGrow: stats.declined }" />
      </div>
      <p v-if="stats && stats.invited" class="muted mt-1.5 flex flex-wrap gap-x-4 text-[0.8125rem]">
        <span><b class="dot split-ok" />{{ stats.accepted }} accepted</span><span><b class="dot split-wait" />{{ stats.pending }} waiting</span><span><b class="dot split-no" />{{ stats.declined }} declined</span>
      </p>

      <div class="mt-5 flex flex-wrap items-end gap-3">
        <label class="grow basis-56"><span class="a-label">Search</span><input v-model="search" class="a-field" type="search" placeholder="Guest name" dir="auto"></label>
        <label><span class="a-label">Show</span><select v-model="filter" class="a-field"><option v-for="(f, key) in filters" :key="key" :value="key">{{ f.label }}</option></select></label>
        <label><span class="a-label">Sort by</span><select v-model="sort" class="a-field"><option v-for="(s, key) in sorters" :key="key" :value="key">{{ s.label }}</option></select></label>
        <button class="a-btn" type="button" @click="sender?.open()">Send by WhatsApp…</button>
        <a class="a-btn" :href="`${api}/csv/invitations.csv`" download>Export links</a>
        <a class="a-btn" :href="`${api}/csv/planner.csv`" download>Export for planner</a>
        <button class="a-btn a-btn-primary" type="button" @click="openEditor(null)">New invitation</button>
      </div>

      <p v-if="failure" class="mt-4 rounded-md border border-[var(--a-no-line)] bg-[var(--a-no-bg)] px-3 py-2 text-danger" role="alert">{{ failure }}</p>

      <!-- Empty states -->
      <div v-if="!invitations.length" class="a-panel mt-5 px-6 py-12 text-center">
        <h2>No invitations yet</h2>
        <p class="muted mx-auto mt-1 max-w-md">Import your guest list from a spreadsheet, or add guests one at a time. Each guest gets a personal link.</p>
        <div class="mt-5 flex justify-center gap-3">
          <NuxtLink class="a-btn a-btn-primary" :to="`/admin/c/${campaign.id}/import`">Import CSV</NuxtLink>
          <button class="a-btn" type="button" @click="openEditor(null)">Add one guest</button>
        </div>
      </div>
      <p v-else-if="!visible.length" class="a-panel muted mt-5 px-6 py-10 text-center">
        No invitations match. <button class="underline" type="button" @click="search = ''; filter = 'all'">Clear search and filter</button>
      </p>

      <div v-else class="a-panel mt-5 overflow-hidden">
        <p class="muted border-b border-[var(--a-line)] px-4 py-2 text-[0.8125rem]">{{ visible.length }} of {{ invitations.length }} invitations</p>
        <table class="list w-full">
          <thead>
            <tr><th>Guest</th><th>RSVP</th><th>Bringing</th><th class="text-right">Attending</th><th>Sent</th><th>Last response</th><th><span class="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="i in visible" :key="i.id">
              <td data-label="Guest">
                <bdi class="font-bold">{{ i.guestName }}</bdi>
                <span v-if="i.language !== (campaign.content.languages[0] ?? 'he')" class="muted ml-2 text-[0.75rem] uppercase">{{ i.language }}</span>
                <span v-if="i.revoked" class="ml-2 text-[0.75rem] font-semibold text-danger">Link revoked</span>
                <span v-if="i.sendError && !i.sentAt" class="block text-[0.75rem] text-danger">Not sent: {{ i.sendError }}</span>
                <span v-else-if="!i.phone && !i.sentAt" class="muted block text-[0.75rem]">No phone number</span>
              </td>
              <td data-label="RSVP">
                <span class="a-tag" :class="`a-tag-${i.rsvpStatus}`">{{ statusLabel[i.rsvpStatus] }}</span>
                <span v-if="i.firstOpenedAt && i.rsvpStatus === 'pending'" class="block pt-1 text-[0.75rem] font-semibold">Opened {{ formatWhen(i.firstOpenedAt) }}</span>
                <span v-else-if="i.rsvpStatus === 'pending'" class="muted block pt-1 text-[0.75rem]">Not opened yet</span>
              </td>
              <td data-label="Bringing">
                <span v-if="!i.guestsAllowed" class="muted">Comes alone</span>
                <span v-else-if="!i.extraGuests.length" class="muted">None yet (up to {{ i.guestLimit }})</span>
                <bdi v-else dir="auto">{{ i.extraGuests.join(', ') }}</bdi>
              </td>
              <td data-label="Attending" class="num text-right font-semibold">{{ i.confirmedCount }}</td>
              <td data-label="Sent">
                <button class="a-btn a-btn-sm" :class="{ 'a-btn-quiet': i.sentAt }" type="button" :title="i.sentAt ? `Sent ${formatWhen(i.sentAt)}. Click to undo.` : 'Record that you sent this link'" @click="patch(i.id, { sent: !i.sentAt })">
                  {{ i.sentAt ? `Sent ${formatWhen(i.sentAt).split(',')[0]}` : 'Mark sent' }}
                </button>
              </td>
              <td data-label="Last response" class="muted num">{{ formatWhen(i.respondedAt) || '—' }}</td>
              <td class="actions">
                <button class="a-btn a-btn-sm" type="button" :disabled="i.revoked" @click="copyLink(i)">Copy link</button>
                <button class="a-btn a-btn-sm" type="button" :disabled="i.revoked" @click="openWhatsapp(i)">WhatsApp</button>
                <button class="a-btn a-btn-sm" type="button" @click="openEditor(i)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-if="notice" class="toast" role="status">{{ notice }}</p>
    <WhatsappSend ref="sender" :api="api" :campaign-id="campaign.id" :live="campaign.status === 'live'" @changed="refresh()" />

    <!-- Create / edit -->
    <dialog ref="editor" class="a-dialog" @click.self="editor?.close()">
      <form class="p-5" @submit.prevent="save">
        <h2>{{ editing ? 'Edit invitation' : 'New invitation' }}</h2>
        <label class="a-label mt-4" for="f-name">Guest name</label>
        <input id="f-name" v-model="form.guestName" class="a-field" required dir="auto" :maxlength="LIMITS.name" autocomplete="off">
        <label class="a-label mt-4" for="f-phone">Phone <span class="muted font-normal">(for sending by WhatsApp; optional)</span></label>
        <input id="f-phone" v-model="form.phone" class="a-field num" type="tel" inputmode="tel" autocomplete="off" placeholder="054-123-4567" dir="ltr">
        <div class="mt-4 grid grid-cols-2 gap-3">
          <label v-if="campaign.content.languages.length > 1"><span class="a-label">Invitation language</span><select v-model="form.language" class="a-field"><option v-for="l in campaign.content.languages" :key="l" :value="l">{{ LANGUAGE_NAMES[l] }}</option></select></label>
          <label v-if="editing"><span class="a-label">RSVP</span><select v-model="form.rsvpStatus" class="a-field"><option value="pending">No response</option><option value="attending">Attending</option><option value="declined">Declined</option></select></label>
        </div>
        <label class="mt-4 block max-w-72"><span class="a-label">Guests they may bring, at most</span><input v-model="form.guestLimit" class="a-field num" type="number" min="0" :max="MAX_EXTRA_GUESTS" inputmode="numeric" :placeholder="`Campaign default (${campaign.content.rsvp.guestLimit})`"></label>
        <p class="muted mt-1 text-[0.8125rem]">Leave empty to follow the campaign's limit. Enter 0 if this guest should come alone.</p>

        <template v-if="editing">
          <template v-if="form.guestLimit !== 0 && form.rsvpStatus === 'attending'">
            <label class="a-label mt-4" for="f-extra">Guests they are bringing <span class="muted font-normal">(one name per line)</span></label>
            <textarea id="f-extra" v-model="form.extraGuests" class="a-field" rows="3" dir="auto" />
          </template>
          <label class="a-label mt-4" for="f-diet">Dietary and accessibility notes</label>
          <textarea id="f-diet" v-model="form.dietaryNotes" class="a-field" rows="2" dir="auto" :maxlength="LIMITS.notes" />
          <div v-if="editing.message" class="mt-4"><span class="a-label">Their message to you</span><p class="whitespace-pre-wrap rounded-md bg-[var(--a-tint)] px-3 py-2" dir="auto">{{ editing.message }}</p></div>
          <label class="mt-4 flex items-center gap-2"><input v-model="form.sent" type="checkbox" class="size-4 accent-[var(--a-sec-text)]"><span class="font-semibold">Invitation sent</span><span v-if="editing.sentAt" class="muted">{{ formatWhen(editing.sentAt) }}</span></label>

          <label class="a-label mt-4" for="f-url">Personal link</label>
          <input id="f-url" class="a-field num" readonly :value="editing.revoked ? 'Revoked' : editing.url" @focus="($event.target as HTMLInputElement).select()">
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="a-btn a-btn-sm" type="button" @click="askRegenerate(editing)">Issue new link…</button>
            <button class="a-btn a-btn-sm" type="button" @click="askRevoke(editing)">{{ editing.revoked ? 'Restore link…' : 'Revoke link…' }}</button>
            <button class="a-btn a-btn-sm a-btn-danger ml-auto" type="button" @click="askDelete(editing)">Delete invitation…</button>
          </div>
        </template>

        <details v-if="editing && history.length" class="mt-5">
          <summary class="cursor-pointer font-semibold">History ({{ history.length }})</summary>
          <ol class="mt-2 grid gap-1.5 text-[0.8125rem]">
            <li v-for="(e, n) in history" :key="n" class="grid grid-cols-[7.5rem_1fr] gap-x-3">
              <time class="muted num" :datetime="e.at">{{ formatWhen(e.at) }}</time>
              <span><span :class="{ 'text-danger': e.kind === 'send_failed' }">{{ eventLabel[e.kind] }}</span><span v-if="e.detail" class="muted" dir="auto">: {{ e.detail }}</span></span>
            </li>
          </ol>
        </details>

        <p v-if="formError" class="mt-4 text-danger" role="alert">{{ formError }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="a-btn" type="button" @click="editor?.close()">Cancel</button>
          <button class="a-btn a-btn-primary" type="submit" :disabled="saving">{{ editing ? 'Save changes' : 'Create invitation' }}</button>
        </div>
      </form>
    </dialog>

    <!-- Confirm destructive actions -->
    <dialog ref="confirmer" class="a-dialog" style="max-width: 26rem">
      <div v-if="pending" class="p-5">
        <h2>{{ pending.title }}</h2>
        <p class="muted mt-2">{{ pending.body }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="a-btn" type="button" autofocus @click="confirmer?.close()">Cancel</button>
          <button class="a-btn" :class="pending.danger ? 'a-btn-danger' : 'a-btn-primary'" type="button" @click="confirmAction">{{ pending.label }}</button>
        </div>
      </div>
    </dialog>

    <!-- WhatsApp message for one guest -->
    <dialog ref="whatsapp" class="a-dialog" @click.self="whatsapp?.close()">
      <div v-if="waFor" class="p-5">
        <h2>Message for <bdi>{{ waFor.guestName }}</bdi></h2>
        <p class="muted mt-1">Edit freely; changes here apply to this message only.</p>
        <textarea v-model="waText" class="a-field mt-3" rows="7" dir="auto" aria-label="Message" />
        <div class="mt-4 flex flex-wrap gap-2">
          <button class="a-btn a-btn-primary" type="button" @click="copyMessage">{{ waCopied ? 'Copied' : 'Copy message' }}</button>
          <a class="a-btn" :href="waLink" target="_blank" rel="noopener noreferrer">Open WhatsApp</a>
          <button class="a-btn ml-auto" type="button" @click="markSentAndClose">{{ waFor.sentAt ? 'Done' : 'Mark as sent' }}</button>
        </div>
        <p class="muted mt-3 text-[0.8125rem]">Nothing is sent automatically. Opening WhatsApp lets you pick the contact yourself.</p>
      </div>
    </dialog>

  </div>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

.stat { padding: 0.9rem 1rem; border-top: 4px solid var(--a-line-strong); border-inline-end: 1px solid var(--a-line); }
.stat:nth-child(1) { border-top-color: var(--a-ok); }
.stat:nth-child(2) { border-top-color: var(--a-guests); }
.stat:nth-child(3) { border-top-color: var(--a-wait); }
.stat:nth-child(4) { border-top-color: var(--a-design); border-inline-end: 0; }
.stat .stat-label { color: var(--a-mute); font-size: 0.8125rem; font-weight: 600; }
.stat .stat-value { font-size: 1.9rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.01em; }
.stat p:last-child { color: var(--a-mute); font-size: 0.8125rem; }
.stat-lead .stat-value { color: var(--a-ok-ink); }
@media (max-width: 40rem) { .stat:nth-child(2) { border-inline-end: 0; } .stat:nth-child(-n+2) { border-bottom: 1px solid var(--a-line); } }

.split { display: flex; height: 0.6rem; border-radius: 999px; overflow: hidden; background: var(--a-tint); }
.split i { display: block; min-width: 0; }
.split-ok { background: var(--a-ok); }
.split-wait { background: var(--a-wait); }
.split-no { background: var(--a-no); }
.dot { display: inline-block; width: 0.6rem; height: 0.6rem; margin-inline-end: 0.35rem; border-radius: 50%; }

.list th { padding: 0.55rem 1rem; text-align: left; font-size: 0.8125rem; font-weight: 600; color: var(--a-mute); border-bottom: 2px solid var(--a-sec); white-space: nowrap; }
.list th.text-right { text-align: right; }
.list td { padding: 0.6rem 1rem; border-bottom: 1px solid var(--a-line); vertical-align: middle; }
.list tbody tr:last-child td { border-bottom: 0; }
.list tbody tr:hover { background: var(--a-hover); }
.actions { display: flex; justify-content: flex-end; gap: 0.4rem; }

/* Below tablet width each invitation becomes a labelled block. */
@media (max-width: 60rem) {
  .list thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .list, .list tbody { display: block; }
  .list tr { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1rem; padding: 0.9rem 1rem; border-bottom: 1px solid var(--a-line); }
  .list td { display: block; padding: 0; border: 0; text-align: left !important; }
  .list td[data-label]::before { content: attr(data-label); display: block; color: var(--a-mute); font-size: 0.75rem; }
  .list td:first-child { grid-column: 1 / -1; font-size: 1.0625rem; }
  .list td:first-child::before { display: none; }
  .list td.actions { grid-column: 1 / -1; justify-content: flex-start; flex-wrap: wrap; margin-top: 0.4rem; }
}

.toast {
  position: fixed;
  inset-inline: 0;
  bottom: 1.25rem;
  width: fit-content;
  max-width: calc(100% - 2rem);
  margin-inline: auto;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  background: var(--a-ink);
  color: #fff;
  box-shadow: 0 10px 30px -8px rgb(21 27 46 / 0.45);
}
</style>
