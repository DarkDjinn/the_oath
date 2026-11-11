<script setup lang="ts">
import { LIMITS, MAX_EXTRA_GUESTS, type GuestInvitation, type RsvpInput } from '#shared/types'
import { rose } from '~/utils/ornament'

const props = defineProps<{ invitation: GuestInvitation, token: string, rsvpBy: string }>()
const emit = defineEmits<{ update: [GuestInvitation] }>()
const { m } = useI18n()

let nextId = 0
const toRows = (names: string[]) => names.map(name => ({ id: nextId++, name }))

const status = ref<RsvpInput['rsvpStatus'] | null>(props.invitation.rsvpStatus === 'pending' ? null : props.invitation.rsvpStatus)
const guests = ref(toRows(props.invitation.extraGuests))
const dietary = ref(props.invitation.dietaryNotes)
const message = ref(props.invitation.message)
const notesOpen = ref(!!(dietary.value || message.value))

/** The form shows until there is an answer; afterwards the confirmation shows until "change". */
const editing = ref(props.invitation.rsvpStatus === 'pending')
const saving = ref(false)
const error = ref('')
const confirmation = ref<HTMLElement>()
const guestInputs = ref<HTMLInputElement[]>([])

const canBringGuests = computed(() => props.invitation.guestsAllowed && status.value === 'attending')
const attendees = computed(() => [props.invitation.guestName, ...props.invitation.extraGuests])
const bloom = rose(12, 12, 10)

async function addGuest() {
  if (guests.value.length >= MAX_EXTRA_GUESTS) return
  guests.value.push({ id: nextId++, name: '' })
  await nextTick()
  guestInputs.value.at(-1)?.focus()
}

function startEditing() {
  status.value = props.invitation.rsvpStatus === 'pending' ? null : props.invitation.rsvpStatus
  guests.value = toRows(props.invitation.extraGuests)
  error.value = ''
  editing.value = true
}

async function submit() {
  if (saving.value) return // a second tap while saving does nothing
  error.value = ''
  if (!status.value) return void (error.value = m.value.errors.chooseStatus)
  const names = canBringGuests.value ? guests.value.map(g => g.name.trim()) : []
  if (names.some(n => !n)) return void (error.value = m.value.errors.guestName)

  saving.value = true
  try {
    const saved = await $fetch<GuestInvitation>('/api/rsvp', {
      method: 'PUT',
      headers: { authorization: `Bearer ${props.token}` },
      body: { rsvpStatus: status.value, extraGuests: names, dietaryNotes: dietary.value, message: message.value } satisfies RsvpInput,
    })
    emit('update', saved)
    editing.value = false
    await nextTick()
    confirmation.value?.focus()
  }
  catch (e) {
    const code = (e as { statusCode?: number })?.statusCode
    if (code === 404) return reloadNuxtApp() // the link was revoked meanwhile
    error.value = code === 429 ? m.value.errors.rateLimited : code === undefined ? m.value.errors.network : code === 400 && (e as { data?: { data?: { code?: string } } }).data?.data?.code?.startsWith('guest_name') ? m.value.errors.guestName : m.value.errors.generic
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <!-- Confirmation -->
  <div v-if="!editing" ref="confirmation" class="confirm" tabindex="-1" role="status">
    <template v-if="invitation.rsvpStatus === 'attending'">
      <svg class="orn confirm-mark" viewBox="0 0 24 24" aria-hidden="true" v-html="bloom" />
      <p class="confirm-title">{{ m.confirm.attendingTitle }}</p>
      <p v-if="attendees.length === 1" class="confirm-body">{{ m.confirm.attendingOne }}</p>
      <template v-else>
        <p class="confirm-body">{{ fill(m.confirm.attendingMany, { count: attendees.length }) }}</p>
        <ul class="confirm-list">
          <li v-for="(name, i) in attendees" :key="i"><svg class="orn confirm-rose" viewBox="0 0 24 24" aria-hidden="true" v-html="bloom" /><bdi>{{ name }}</bdi></li>
        </ul>
      </template>
    </template>
    <template v-else>
      <p class="confirm-title">{{ m.confirm.declinedTitle }}</p>
      <p class="confirm-body">{{ m.confirm.declinedBody }}</p>
    </template>
    <button type="button" class="text-button confirm-change" @click="startEditing">{{ m.confirm.change }}</button>
    <p v-if="invitation.rsvpStatus === 'attending'" class="confirm-hint">{{ m.confirm.changeHint }}</p>
  </div>

  <!-- Form -->
  <form v-else class="form" novalidate @submit.prevent="submit">
    <p class="form-lead"><bdi>{{ invitation.guestName }}</bdi>{{ m.rsvp.lead.replace('{name}', '') }} <span v-if="rsvpBy">{{ fill(m.rsvp.by, { date: rsvpBy }) }}</span></p>

    <fieldset class="choices">
      <legend class="sr-only">{{ m.rsvp.choice }}</legend>
      <label class="choice" :class="{ 'is-on': status === 'attending' }">
        <input v-model="status" type="radio" name="status" value="attending" class="sr-only">
        <span class="choice-mark"><svg class="orn" viewBox="0 0 24 24" aria-hidden="true" v-html="bloom" /></span>
        <span>{{ m.rsvp.attending }}</span>
      </label>
      <label class="choice choice-no" :class="{ 'is-on': status === 'declined' }">
        <input v-model="status" type="radio" name="status" value="declined" class="sr-only">
        <span class="choice-mark" />
        <span>{{ m.rsvp.declined }}</span>
      </label>
    </fieldset>

    <fieldset v-if="canBringGuests" class="guests">
      <legend>{{ m.rsvp.guestsTitle }}</legend>
      <p class="hint">{{ m.rsvp.guestsHint }}</p>
      <ul v-if="guests.length" class="guest-rows">
        <li v-for="(guest, i) in guests" :key="guest.id">
          <input
            ref="guestInputs" v-model="guest.name" class="field" type="text" autocomplete="off" dir="auto"
            :maxlength="LIMITS.name" :placeholder="m.rsvp.guestPlaceholder" :aria-label="fill(m.rsvp.guestLabel, { n: i + 1 })"
          >
          <button type="button" class="guest-remove" :aria-label="guest.name ? fill(m.rsvp.removeGuest, { name: guest.name }) : m.rsvp.removeGuestEmpty" @click="guests.splice(i, 1)">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
          </button>
        </li>
      </ul>
      <button v-if="guests.length < MAX_EXTRA_GUESTS" type="button" class="add-guest" @click="addGuest">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg>
        {{ m.rsvp.addGuest }}
      </button>
    </fieldset>

    <div v-if="status" class="notes">
      <button v-if="!notesOpen" type="button" class="text-button" @click="notesOpen = true">{{ m.rsvp.notesToggle }}</button>
      <template v-else>
        <label v-if="status === 'attending'" class="note-field">
          <span>{{ m.rsvp.dietary }} <small>({{ m.rsvp.optional }})</small></span>
          <textarea v-model="dietary" class="field" rows="2" dir="auto" :maxlength="LIMITS.notes" />
        </label>
        <label class="note-field">
          <span>{{ m.rsvp.message }} <small>({{ m.rsvp.optional }})</small></span>
          <textarea v-model="message" class="field" rows="3" dir="auto" :maxlength="LIMITS.message" />
        </label>
      </template>
    </div>

    <p v-if="error" class="form-error" role="alert">{{ error }}</p>
    <button type="submit" class="plate form-submit" :disabled="saving" :aria-busy="saving">{{ saving ? m.rsvp.saving : m.rsvp.submit }}</button>
  </form>
</template>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

.form { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 0.9rem; }
.form-lead { color: var(--color-mute); text-wrap: pretty; }
.form-lead bdi { color: var(--color-ivory); }

.choices { display: grid; gap: 0.75rem; }
.choice {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 4rem;
  padding: 0.6rem 1.1rem;
  border: 1px solid var(--color-gold-dim);
  background: var(--color-plate);
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 500;
  text-align: start;
  cursor: pointer;
  transition: background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}
.choice:hover { border-color: var(--color-gold); }
.choice:has(:focus-visible) { outline: 2px solid var(--color-gold); outline-offset: 3px; }
/* Selected: a doubled gold line, never the wine of the submit plate. */
.choice.is-on { background: var(--color-plate-2); border-color: var(--color-gold); box-shadow: inset 0 0 0 1px var(--color-gold); }
/* The socket is always there; saying yes makes the rose bloom in it. */
.choice-mark { flex: none; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; border: 1px solid var(--color-gold-dim); border-radius: 50%; transition: border-color 0.3s ease; }
.choice-mark .orn { width: 1.9rem; height: 1.9rem; opacity: 0; transform: scale(0.3) rotate(-70deg); transition: opacity 0.4s ease, transform 0.7s var(--ease-out-expo); }
.choice.is-on .choice-mark { border-color: transparent; }
.choice.is-on .choice-mark .orn { opacity: 1; transform: none; }
.choice-no .choice-mark::after { content: ''; width: 0.8rem; height: 0.8rem; border-radius: 50%; background: var(--color-ivory); transform: scale(0); transition: transform 0.4s var(--ease-out-expo); }
.choice-no.is-on .choice-mark { border-color: var(--color-ivory); }
.choice-no.is-on .choice-mark::after { transform: none; }

.guests { text-align: start; }
.guests legend { font-family: var(--font-display); font-size: 1.35rem; font-weight: 600; }
.hint { color: var(--color-mute); font-size: 1.0625rem; }
.guest-rows { display: grid; gap: 0.6rem; margin-top: 0.9rem; }
.guest-rows li { display: flex; gap: 0.5rem; }
.guest-remove { flex: none; width: 3.25rem; display: grid; place-items: center; border: 1px solid var(--color-gold-dim); background: none; color: var(--color-mute); cursor: pointer; }
.guest-remove:hover { color: var(--color-ivory); border-color: var(--color-gold); }
.add-guest { display: inline-flex; align-items: center; gap: 0.5rem; min-height: 3rem; margin-top: 0.75rem; padding: 0.4rem 1rem; border: 1px dashed var(--color-gold-dim); background: none; color: var(--color-gold); cursor: pointer; }
.add-guest:hover { border-color: var(--color-gold); color: var(--color-ivory); }

.notes { display: grid; gap: 1rem; text-align: start; }
.notes > .text-button { justify-self: center; text-align: center; }
.note-field { display: grid; gap: 0.35rem; }
.note-field small { color: var(--color-mute); font-size: 0.9em; }

.form-error { padding: 0.7rem 1rem; border: 1px solid var(--color-danger); color: var(--color-danger); }
.form-submit { width: 100%; }

.confirm { margin-top: 1rem; outline: none; }
.confirm-mark { width: 2.4rem; height: 2.4rem; margin: 0.4rem auto 0.6rem; }
.confirm-title { font-family: var(--font-display); font-size: 1.9rem; font-weight: 600; line-height: 1.25; }
.confirm-body { margin-top: 0.4rem; color: var(--color-mute); text-wrap: pretty; }
.confirm-list { display: inline-grid; gap: 0.35rem; margin-top: 0.9rem; text-align: start; font-size: 1.25rem; }
.confirm-list li { display: flex; align-items: center; gap: 0.6rem; }
.confirm-rose { width: 1.25rem; height: 1.25rem; flex: none; }
.confirm-change { display: block; margin: 1.4rem auto 0; min-height: 2.75rem; }
.confirm-hint { color: var(--color-mute); font-size: 1rem; }
</style>
