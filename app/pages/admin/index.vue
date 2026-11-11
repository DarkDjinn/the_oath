<script setup lang="ts">
import { LIMITS, type AdminInvitation, type Language, type RsvpStatus, type Stats } from '#shared/types'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Guest list', htmlAttrs: { lang: 'en', dir: 'ltr' } })

type Templates = Record<Language, string>
const { data, refresh } = await useAsyncData('admin-invitations', () =>
  useRequestFetch()<{ invitations: AdminInvitation[], stats: Stats }>('/api/admin/invitations'))
const { data: settings } = await useAsyncData('admin-settings', () =>
  useRequestFetch()<{ whatsapp: Templates }>('/api/admin/settings'))

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
  chase: { label: 'Sent, no response', test: i => !!i.sentAt && i.rsvpStatus === 'pending' },
  bringing: { label: 'Bringing guests', test: i => i.extraGuests.length > 0 },
}
const statusOrder: Record<RsvpStatus, number> = { pending: 0, attending: 1, declined: 2 }
const sorters: Record<string, { label: string, by: (a: AdminInvitation, b: AdminInvitation) => number }> = {
  name: { label: 'Name', by: (a, b) => a.guestName.localeCompare(b.guestName, ['he', 'en']) },
  status: { label: 'RSVP status', by: (a, b) => statusOrder[a.rsvpStatus] - statusOrder[b.rsvpStatus] },
  responded: { label: 'Latest response', by: (a, b) => (b.respondedAt ?? '').localeCompare(a.respondedAt ?? '') },
  created: { label: 'Newest first', by: (a, b) => b.id - a.id },
}
const visible = computed(() => {
  const q = search.value.trim().toLowerCase()
  return invitations.value
    .filter(i => filters[filter.value]!.test(i))
    .filter(i => !q || [i.guestName, ...i.extraGuests].some(n => n.toLowerCase().includes(q)))
    .sort((a, b) => sorters[sort.value]!.by(a, b) || a.guestName.localeCompare(b.guestName, ['he', 'en']))
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
  run(() => adminFetch<AdminInvitation>(`/api/admin/invitations/${id}`, { method: 'PATCH', body }), done)

async function copyLink(i: AdminInvitation) {
  say(await copyText(i.url) ? `Link for ${i.guestName} copied. It is not marked as sent.` : 'Could not copy. Select the link in Edit instead.')
}
async function signOut() {
  await $fetch('/api/admin/logout', { method: 'POST' })
  await navigateTo('/admin/login')
}

// ------------------------------------------------------- create / edit form
const editor = ref<HTMLDialogElement>()
const editing = ref<AdminInvitation | null>(null)
const form = reactive({ guestName: '', language: 'he' as Language, guestsAllowed: false, rsvpStatus: 'pending' as RsvpStatus, extraGuests: '', dietaryNotes: '', sent: false })
const formError = ref('')
const saving = ref(false)

function openEditor(i: AdminInvitation | null) {
  editing.value = i
  formError.value = ''
  Object.assign(form, i
    ? { guestName: i.guestName, language: i.language, guestsAllowed: i.guestsAllowed, rsvpStatus: i.rsvpStatus, extraGuests: i.extraGuests.join('\n'), dietaryNotes: i.dietaryNotes, sent: !!i.sentAt }
    : { guestName: '', language: 'he', guestsAllowed: false, rsvpStatus: 'pending', extraGuests: '', dietaryNotes: '', sent: false })
  editor.value?.showModal()
}
async function save() {
  if (saving.value) return
  saving.value = true
  formError.value = ''
  try {
    if (editing.value) {
      await adminFetch(`/api/admin/invitations/${editing.value.id}`, {
        method: 'PATCH',
        body: { ...form, extraGuests: form.extraGuests.split('\n').map(n => n.trim()).filter(Boolean) },
      })
      say(`Saved ${form.guestName}.`)
    }
    else {
      await adminFetch('/api/admin/invitations', { method: 'POST', body: { guestName: form.guestName, language: form.language, guestsAllowed: form.guestsAllowed } })
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
  action: () => run(() => adminFetch(`/api/admin/invitations/${i.id}`, { method: 'DELETE' }), `Deleted ${i.guestName}.`),
})
const askRegenerate = (i: AdminInvitation) => ask({
  title: `Issue a new link for ${i.guestName}?`,
  body: 'The current link stops working immediately. Their RSVP is kept. You will need to send them the new link, so it is marked as not sent.',
  label: 'Issue new link',
  danger: true,
  action: () => run(() => adminFetch(`/api/admin/invitations/${i.id}/regenerate`, { method: 'POST' }), `New link issued for ${i.guestName}.`),
})
const askRevoke = (i: AdminInvitation) => ask({
  title: i.revoked ? `Restore the link for ${i.guestName}?` : `Revoke the link for ${i.guestName}?`,
  body: i.revoked ? 'The same link will work again.' : 'The link stops working until you restore it. Their RSVP is kept.',
  label: i.revoked ? 'Restore link' : 'Revoke link',
  danger: !i.revoked,
  action: () => run(() => adminFetch(`/api/admin/invitations/${i.id}/revoke`, { method: 'POST', body: { revoked: !i.revoked } }), i.revoked ? 'Link restored.' : 'Link revoked.'),
})

// ----------------------------------------------------------------- WhatsApp
const whatsapp = ref<HTMLDialogElement>()
const waFor = ref<AdminInvitation | null>(null)
const waText = ref('')
const waCopied = ref(false)
function openWhatsapp(i: AdminInvitation) {
  waFor.value = i
  waCopied.value = false
  waText.value = fill(settings.value?.whatsapp[i.language] ?? '{link}', { name: i.guestName, link: i.url })
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

// ------------------------------------------------------- message templates
const templates = ref<HTMLDialogElement>()
const draft = reactive<Templates>({ he: '', en: '' })
const templateError = ref('')
function openTemplates() {
  Object.assign(draft, settings.value?.whatsapp)
  templateError.value = ''
  templates.value?.showModal()
}
async function saveTemplates() {
  templateError.value = ''
  try {
    settings.value = await adminFetch('/api/admin/settings', { method: 'PUT', body: { whatsapp: draft } })
    templates.value?.close()
    say('Messages saved.')
  }
  catch (e) {
    templateError.value = apiError(e)
  }
}

const statusLabel: Record<RsvpStatus, string> = { pending: 'No response', attending: 'Attending', declined: 'Declined' }
</script>

<template>
  <div class="admin">
    <header class="border-b border-[#2b262d]">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
        <h1 class="mr-auto">Guest list</h1>
        <NuxtLink class="a-btn" to="/admin/import">Import CSV</NuxtLink>
        <a class="a-btn" href="/api/admin/csv/invitations.csv" download>Export links</a>
        <a class="a-btn" href="/api/admin/csv/planner.csv" download>Export for planner</a>
        <button class="a-btn" type="button" @click="openTemplates">WhatsApp messages</button>
        <button class="a-btn a-btn-quiet" type="button" @click="signOut">Sign out</button>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 pb-16">
      <!-- Counts: invitations and people are kept apart on purpose. -->
      <section v-if="stats" aria-label="Summary" class="a-panel mt-5 grid grid-cols-2 gap-px overflow-hidden bg-[#2b262d] sm:grid-cols-4">
        <div class="stat stat-lead">
          <p class="stat-label">Confirmed attendees</p>
          <p class="stat-value num">{{ stats.confirmedAttendees }}</p>
          <p>{{ stats.accepted }} invited + {{ stats.confirmedExtraGuests }} they are bringing</p>
        </div>
        <div class="stat"><p class="stat-label">Invited (links)</p><p class="stat-value num">{{ stats.invited }}</p><p>{{ stats.sent }} sent, {{ stats.invited - stats.sent }} not sent</p></div>
        <div class="stat"><p class="stat-label">No response yet</p><p class="stat-value num">{{ stats.pending }}</p><p>{{ stats.accepted }} accepted, {{ stats.declined }} declined</p></div>
        <div class="stat">
          <p class="stat-label">If everyone pending comes</p>
          <p class="stat-value num">{{ stats.expectedIfAllPendingAttend }}<span v-if="stats.openEnded" title="Open-ended">+</span></p>
          <p v-if="stats.openEnded">No fixed maximum: {{ stats.openEnded }} {{ stats.openEnded === 1 ? 'invitee' : 'invitees' }} may still add guests</p>
          <p v-else>Maximum possible attendance</p>
        </div>
      </section>

      <div class="mt-5 flex flex-wrap items-end gap-3">
        <label class="grow basis-56"><span class="a-label">Search</span><input v-model="search" class="a-field" type="search" placeholder="Guest name" dir="auto"></label>
        <label><span class="a-label">Show</span><select v-model="filter" class="a-field"><option v-for="(f, key) in filters" :key="key" :value="key">{{ f.label }}</option></select></label>
        <label><span class="a-label">Sort by</span><select v-model="sort" class="a-field"><option v-for="(s, key) in sorters" :key="key" :value="key">{{ s.label }}</option></select></label>
        <button class="a-btn a-btn-primary" type="button" @click="openEditor(null)">New invitation</button>
      </div>

      <p v-if="failure" class="mt-4 rounded-md border border-[#6a3a35] bg-[#2b1a19] px-3 py-2 text-danger" role="alert">{{ failure }}</p>

      <!-- Empty states -->
      <div v-if="!invitations.length" class="a-panel mt-5 px-6 py-12 text-center">
        <h2>No invitations yet</h2>
        <p class="muted mx-auto mt-1 max-w-md">Import your guest list from a spreadsheet, or add guests one at a time. Each guest gets a personal link.</p>
        <div class="mt-5 flex justify-center gap-3">
          <NuxtLink class="a-btn a-btn-primary" to="/admin/import">Import CSV</NuxtLink>
          <button class="a-btn" type="button" @click="openEditor(null)">Add one guest</button>
        </div>
      </div>
      <p v-else-if="!visible.length" class="a-panel muted mt-5 px-6 py-10 text-center">
        No invitations match. <button class="underline" type="button" @click="search = ''; filter = 'all'">Clear search and filter</button>
      </p>

      <div v-else class="a-panel mt-5 overflow-hidden">
        <p class="muted border-b border-[#2b262d] px-4 py-2 text-[0.8125rem]">{{ visible.length }} of {{ invitations.length }} invitations</p>
        <table class="list w-full">
          <thead>
            <tr><th>Guest</th><th>RSVP</th><th>Bringing</th><th class="text-right">Attending</th><th>Sent</th><th>Last response</th><th><span class="sr-only">Actions</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="i in visible" :key="i.id">
              <td data-label="Guest">
                <bdi class="font-semibold text-[#f6f1e7]">{{ i.guestName }}</bdi>
                <span v-if="i.language === 'en'" class="muted ml-2 text-[0.75rem]">EN</span>
                <span v-if="i.revoked" class="ml-2 text-[0.75rem] font-semibold text-danger">Link revoked</span>
              </td>
              <td data-label="RSVP"><span class="a-tag" :class="`a-tag-${i.rsvpStatus}`">{{ statusLabel[i.rsvpStatus] }}</span></td>
              <td data-label="Bringing">
                <span v-if="!i.guestsAllowed" class="muted">Not allowed</span>
                <span v-else-if="!i.extraGuests.length" class="muted">Allowed, none</span>
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
    </main>

    <p v-if="notice" class="toast" role="status">{{ notice }}</p>

    <!-- Create / edit -->
    <dialog ref="editor" class="a-dialog" @click.self="editor?.close()">
      <form class="p-5" @submit.prevent="save">
        <h2>{{ editing ? 'Edit invitation' : 'New invitation' }}</h2>
        <label class="a-label mt-4" for="f-name">Guest name</label>
        <input id="f-name" v-model="form.guestName" class="a-field" required dir="auto" :maxlength="LIMITS.name" autocomplete="off">
        <div class="mt-4 grid grid-cols-2 gap-3">
          <label><span class="a-label">Invitation language</span><select v-model="form.language" class="a-field"><option value="he">Hebrew</option><option value="en">English</option></select></label>
          <label v-if="editing"><span class="a-label">RSVP</span><select v-model="form.rsvpStatus" class="a-field"><option value="pending">No response</option><option value="attending">Attending</option><option value="declined">Declined</option></select></label>
        </div>
        <label class="mt-4 flex items-start gap-2"><input v-model="form.guestsAllowed" type="checkbox" class="mt-1 size-4 accent-[#c9a961]"><span><span class="font-semibold">May bring guests</span><br><span class="muted">They can add as many named guests as they like when they reply.</span></span></label>

        <template v-if="editing">
          <template v-if="form.guestsAllowed && form.rsvpStatus === 'attending'">
            <label class="a-label mt-4" for="f-extra">Guests they are bringing <span class="muted font-normal">(one name per line)</span></label>
            <textarea id="f-extra" v-model="form.extraGuests" class="a-field" rows="3" dir="auto" />
          </template>
          <label class="a-label mt-4" for="f-diet">Dietary and accessibility notes</label>
          <textarea id="f-diet" v-model="form.dietaryNotes" class="a-field" rows="2" dir="auto" :maxlength="LIMITS.notes" />
          <div v-if="editing.message" class="mt-4"><span class="a-label">Their message to you</span><p class="whitespace-pre-wrap rounded-md bg-[#151216] px-3 py-2" dir="auto">{{ editing.message }}</p></div>
          <label class="mt-4 flex items-center gap-2"><input v-model="form.sent" type="checkbox" class="size-4 accent-[#c9a961]"><span class="font-semibold">Invitation sent</span><span v-if="editing.sentAt" class="muted">{{ formatWhen(editing.sentAt) }}</span></label>

          <label class="a-label mt-4" for="f-url">Personal link</label>
          <input id="f-url" class="a-field num" readonly :value="editing.revoked ? 'Revoked' : editing.url" @focus="($event.target as HTMLInputElement).select()">
          <div class="mt-3 flex flex-wrap gap-2">
            <button class="a-btn a-btn-sm" type="button" @click="askRegenerate(editing)">Issue new link…</button>
            <button class="a-btn a-btn-sm" type="button" @click="askRevoke(editing)">{{ editing.revoked ? 'Restore link…' : 'Revoke link…' }}</button>
            <button class="a-btn a-btn-sm a-btn-danger ml-auto" type="button" @click="askDelete(editing)">Delete invitation…</button>
          </div>
        </template>

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

    <!-- Default messages -->
    <dialog ref="templates" class="a-dialog" @click.self="templates?.close()">
      <form class="p-5" @submit.prevent="saveTemplates">
        <h2>WhatsApp messages</h2>
        <p class="muted mt-1"><code>{name}</code> becomes the guest's name and <code>{link}</code> their personal link.</p>
        <label class="a-label mt-4" for="t-he">Hebrew invitations</label>
        <textarea id="t-he" v-model="draft.he" class="a-field" rows="6" dir="rtl" lang="he" />
        <label class="a-label mt-4" for="t-en">English invitations</label>
        <textarea id="t-en" v-model="draft.en" class="a-field" rows="6" dir="ltr" />
        <p v-if="templateError" class="mt-3 text-danger" role="alert">{{ templateError }}</p>
        <div class="mt-6 flex justify-end gap-2">
          <button class="a-btn" type="button" @click="templates?.close()">Cancel</button>
          <button class="a-btn a-btn-primary" type="submit">Save messages</button>
        </div>
      </form>
    </dialog>
  </div>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

.stat { background: #161317; padding: 0.9rem 1rem; }
.stat .stat-label { color: #a79f92; font-size: 0.8125rem; font-weight: 550; }
.stat .stat-value { font-size: 1.75rem; font-weight: 650; line-height: 1.2; letter-spacing: -0.01em; }
.stat p:last-child { color: #a79f92; font-size: 0.8125rem; }
.stat-lead .stat-value { color: var(--color-gold); }

.list th { padding: 0.55rem 1rem; text-align: left; font-size: 0.8125rem; font-weight: 600; color: #a79f92; border-bottom: 1px solid #2b262d; white-space: nowrap; }
.list th.text-right { text-align: right; }
.list td { padding: 0.6rem 1rem; border-bottom: 1px solid #231f25; vertical-align: middle; }
.list tbody tr:last-child td { border-bottom: 0; }
.list tbody tr:hover { background: #1a161b; }
.actions { display: flex; justify-content: flex-end; gap: 0.4rem; }

/* Below tablet width each invitation becomes a labelled block. */
@media (max-width: 60rem) {
  .list thead { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
  .list, .list tbody { display: block; }
  .list tr { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 1rem; padding: 0.9rem 1rem; border-bottom: 1px solid #2b262d; }
  .list td { display: block; padding: 0; border: 0; text-align: left !important; }
  .list td[data-label]::before { content: attr(data-label); display: block; color: #a79f92; font-size: 0.75rem; }
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
  border: 1px solid #564d59;
  border-radius: 8px;
  background: #262027;
  box-shadow: 0 10px 30px -8px rgb(0 0 0 / 0.6);
}
code { padding: 0.05rem 0.3rem; border-radius: 4px; background: #262027; font-size: 0.875em; }
</style>
