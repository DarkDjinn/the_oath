<script setup lang="ts">
import type { AdminInvitation, ImportPreview } from '#shared/types'

const { campaign, api } = useCampaignAdmin()

const csv = ref('')
const fileName = ref('')
const preview = ref<ImportPreview | null>(null)
const excluded = ref(new Set<number>())
const created = ref<AdminInvitation[] | null>(null)
const error = ref('')
const busy = ref(false)
const copied = ref<number | null>(null)

/** Excel saves "CSV UTF-8" with a BOM, plain "CSV" in the Windows Hebrew code page, and "Unicode Text" as UTF-16. */
function decode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) return new TextDecoder('utf-16le').decode(buffer)
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) return new TextDecoder('utf-16be').decode(buffer)
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer) }
  catch { return new TextDecoder('windows-1255').decode(buffer) }
}

async function onFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  error.value = ''
  preview.value = null
  created.value = null
  if (file.size > 900_000) return void (error.value = 'That file is larger than 900 KB. A guest list should be far smaller; check you picked the right file.')
  fileName.value = file.name
  csv.value = decode(await file.arrayBuffer())
  busy.value = true
  try {
    preview.value = await adminFetch<ImportPreview>(`${api}/import/preview`, { method: 'POST', body: { csv: csv.value } })
    // Rows with errors cannot be imported, so they start unticked.
    excluded.value = new Set(preview.value.rows.filter(r => r.errors.length).map(r => r.row))
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}

function toggle(row: number, include: boolean) {
  const next = new Set(excluded.value)
  if (include) next.delete(row)
  else next.add(row)
  excluded.value = next
}

const selected = computed(() => preview.value?.rows.filter(r => !excluded.value.has(r.row)) ?? [])
const selectedGuestsAllowed = computed(() => selected.value.filter(r => r.guestsAllowed).length)
const blocked = computed(() => selected.value.some(r => r.errors.length))

async function confirmImport() {
  if (busy.value || !selected.value.length || blocked.value) return
  busy.value = true
  error.value = ''
  try {
    const result = await adminFetch<{ created: AdminInvitation[] }>(`${api}/import/commit`, { method: 'POST', body: { csv: csv.value, excludedRows: [...excluded.value] } })
    created.value = result.created
    preview.value = null
  }
  catch (e) { error.value = apiError(e) }
  finally { busy.value = false }
}

async function copy(i: AdminInvitation) {
  if (await copyText(i.url)) copied.value = i.id
}
const linksCsv = computed(() => `${api}/csv/invitations.csv?ids=${created.value?.map(i => i.id).join(',')}`)
</script>

<template>
  <div>
    <div class="max-w-4xl">
      <!-- Done -->
      <section v-if="created" class="mt-6">
        <h2>{{ created.length }} {{ created.length === 1 ? 'invitation' : 'invitations' }} created</h2>
        <p class="muted mt-1">Each guest has a personal link. None are marked as sent yet.</p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a class="a-btn a-btn-primary" :href="linksCsv" download>Download these links (CSV)</a>
          <NuxtLink class="a-btn" :to="`/admin/c/${campaign.id}`">Go to guest list</NuxtLink>
        </div>
        <ul class="a-panel mt-5 divide-y divide-[var(--a-line)]">
          <li v-for="i in created" :key="i.id" class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
            <bdi class="font-semibold">{{ i.guestName }}</bdi>
            <span class="muted min-w-0 grow truncate text-[0.8125rem]">{{ i.url }}</span>
            <button class="a-btn a-btn-sm" type="button" @click="copy(i)">{{ copied === i.id ? 'Copied' : 'Copy link' }}</button>
          </li>
        </ul>
      </section>

      <template v-else>
        <section class="mt-6 grid gap-6 md:grid-cols-[1fr_18rem]">
          <div>
            <h2>1. Prepare your list</h2>
            <p class="muted mt-1">One row per invited guest. Each row becomes one invitation with its own link.</p>
            <table class="spec mt-3">
              <tbody>
                <tr><th><code>name</code></th><td>The guest's full name, in Hebrew or English. Required.</td></tr>
                <tr><th><code>plus_one_allowed</code></th><td><code>true</code> if they may bring guests (up to the campaign's limit), <code>false</code> if not, or a number for that guest's own limit: <code>1</code> for a plus-one, <code>4</code> for a family. Blank means false.</td></tr>
                <tr><th><code>language</code></th><td>Optional. <code>he</code> or <code>en</code> for that guest's invitation. Blank means Hebrew.</td></tr>
              </tbody>
            </table>
            <p class="muted mt-3">For a couple or a family, add one row for one of them and set <code>plus_one_allowed</code> to <code>true</code>.</p>
            <a class="a-btn mt-3" :href="`${api}/csv/template.csv`" download>Download template</a>
          </div>
          <div class="a-panel p-4 text-[0.875rem]">
            <h2 class="text-[0.9375rem]">What importing does</h2>
            <ul class="muted mt-2 list-disc space-y-1.5 pl-4">
              <li>Only adds new invitations. Existing invitations and RSVPs are never changed.</li>
              <li>Importing the same file twice creates the guests twice; the preview warns you first.</li>
              <li>Two guests may share a name. Names are never used to merge people.</li>
              <li>Nothing is saved until you confirm, and an import is all-or-nothing.</li>
            </ul>
          </div>
        </section>

        <section class="mt-8">
          <h2>2. Upload the file</h2>
          <p class="muted mt-1">In Excel choose “CSV UTF-8”; in Google Sheets, File → Download → CSV.</p>
          <input class="a-field mt-3 max-w-md file:mr-3 file:rounded file:border-0 file:bg-[var(--a-line)] file:px-3 file:py-1 file:text-inherit" type="file" accept=".csv,.tsv,.txt,text/csv" aria-label="CSV file" @change="onFile">
        </section>

        <p v-if="busy && !preview" class="muted mt-6" role="status">Reading {{ fileName }}…</p>
        <p v-if="error" class="mt-6 rounded-md border border-[var(--a-no-line)] bg-[var(--a-no-bg)] px-3 py-2 text-danger" role="alert">{{ error }}</p>

        <section v-if="preview" class="mt-8">
          <h2>3. Check and confirm</h2>
          <div v-if="preview.fileErrors.length" class="mt-3 rounded-md border border-[var(--a-no-line)] bg-[var(--a-no-bg)] px-3 py-2 text-danger" role="alert">
            <p v-for="e in preview.fileErrors" :key="e">{{ e }}</p>
          </div>
          <template v-else>
            <p class="mt-2">
              <strong class="num">{{ selected.length }}</strong> {{ selected.length === 1 ? 'invitation' : 'invitations' }} will be created<span v-if="selected.length !== preview.totals.rows" class="muted"> ({{ preview.totals.rows - selected.length }} unticked)</span>.
              <strong class="num">{{ selectedGuestsAllowed }}</strong> may bring guests, so attendance is at least {{ selected.length }} if everyone comes.
            </p>
            <p v-if="preview.totals.errors" class="mt-2 text-danger">{{ preview.totals.errors }} {{ preview.totals.errors === 1 ? 'row has an error' : 'rows have errors' }} and cannot be imported. Fix the file and upload again, or leave {{ preview.totals.errors === 1 ? 'it' : 'them' }} unticked.</p>
            <p v-if="preview.totals.warnings" class="mt-2 text-warn">{{ preview.totals.warnings }} {{ preview.totals.warnings === 1 ? 'row looks' : 'rows look' }} like a possible duplicate. Untick any you do not want.</p>

            <div class="a-panel mt-4 overflow-x-auto">
              <table class="preview w-full">
                <thead><tr><th>Import</th><th>Row</th><th>Name</th><th>May bring guests</th><th>Language</th><th>Notes</th></tr></thead>
                <tbody>
                  <tr v-for="r in preview.rows" :key="r.row" :class="{ 'opacity-50': excluded.has(r.row) }">
                    <td><input type="checkbox" class="size-4 accent-[var(--a-sec-text)]" :checked="!excluded.has(r.row)" :disabled="r.errors.length > 0" :aria-label="`Import row ${r.row}`" @change="toggle(r.row, ($event.target as HTMLInputElement).checked)"></td>
                    <td class="muted num">{{ r.row }}</td>
                    <td class="whitespace-nowrap"><bdi class="font-semibold">{{ r.name || '(empty)' }}</bdi></td>
                    <td>{{ r.guestsAllowed ? (r.guestLimit ? `Up to ${r.guestLimit}` : 'Yes') : 'No' }}</td>
                    <td>{{ r.language === 'he' ? 'Hebrew' : 'English' }}</td>
                    <td>
                      <p v-for="e in r.errors" :key="e" class="text-danger">{{ e }}</p>
                      <p v-for="w in r.warnings" :key="w" class="text-warn">{{ w }}</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="mt-5 flex items-center gap-3">
              <button class="a-btn a-btn-primary" type="button" :disabled="busy || blocked || !selected.length" @click="confirmImport">{{ busy ? 'Importing…' : `Import ${selected.length} ${selected.length === 1 ? 'invitation' : 'invitations'}` }}</button>
              <span v-if="!selected.length" class="muted">Tick at least one row.</span>
            </div>
          </template>
        </section>
      </template>
    </div>
  </div>
</template>

<style scoped>
.spec th { padding: 0.3rem 1rem 0.3rem 0; text-align: left; vertical-align: top; white-space: nowrap; font-weight: 500; }
.spec td { padding: 0.3rem 0; color: var(--a-mute); }
.preview th { padding: 0.5rem 0.9rem; text-align: left; font-size: 0.8125rem; font-weight: 600; color: var(--a-mute); border-bottom: 2px solid var(--a-sec); white-space: nowrap; }
.preview td { padding: 0.5rem 0.9rem; border-bottom: 1px solid var(--a-line); vertical-align: top; }
.preview tbody tr:last-child td { border-bottom: 0; }
</style>
