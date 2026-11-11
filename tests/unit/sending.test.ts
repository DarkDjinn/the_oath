import { describe, expect, it } from 'vitest'
import { ValidationError } from '../../server/core/errors'
import { buildPreview, commitImport } from '../../server/core/importer'
import { createInvitation, deleteInvitation, getById, getByToken, listEvents, listInvitations, markOpened, regenerateToken, setRevoked, submitRsvp, toGuest, updateInvitation } from '../../server/core/invitations'
import { normalisePhone } from '../../server/core/phone'
import { SendQueue, type QueueItem, type SenderKey } from '../../server/core/sender'
import { fakeTransport } from '../../server/core/whatsapp'
import { freshDb, SECRET, tokenOf } from './helpers'

describe('phone numbers', () => {
  it('normalises Israeli and international numbers to one form', () => {
    for (const local of ['054-123-4567', '0541234567', '054 123 4567', '(054) 123-4567', '541234567', '972541234567', '+972 54-123-4567', '00972541234567']) {
      expect(normalisePhone(local), local).toBe('+972541234567')
    }
    expect(normalisePhone('+44 7700 900123')).toBe('+447700900123')
    expect(normalisePhone("'+44 7700 900123")).toBe('+447700900123') // as a spreadsheet stores text
    expect(normalisePhone('')).toBe('')
    expect(normalisePhone(null)).toBe('')
  })

  it('rejects things that are not phone numbers', () => {
    for (const bad of ['call me', '054-12', '+1', '0541234567890123456', 'abc0541234567', { phone: 1 }]) expect(() => normalisePhone(bad), String(bad)).toThrow(ValidationError)
  })

  it('is stored on the invitation, editable, importable, and never shown to the guest', () => {
    const db = freshDb()
    const row = createInvitation(db, SECRET, 1, { guestName: 'Dana', phone: '052-111-2222' })
    expect(row.phone).toBe('+972521112222')
    expect(toGuest(row)).not.toHaveProperty('phone')
    expect(updateInvitation(db, 1, row.id, { phone: '' }).phone).toBe('')
    expect(() => updateInvitation(db, 1, row.id, { phone: 'nope' })).toThrow(ValidationError)

    const preview = buildPreview('name,phone\nA,054-123-4567\nB,\nC,12\n', [])
    expect(preview.rows.map(r => r.phone)).toEqual(['+972541234567', '', ''])
    expect(preview.rows[2]!.errors[0]).toMatch(/complete phone number/)
    expect(commitImport(db, SECRET, 1, 'name,טלפון\nE,0501234567\n')[0]!.phone).toBe('+972501234567')
  })
})

describe('automatic sending', () => {
  /** A queue with no real waiting; `slept` records the pauses it asked for. */
  function setup(options: { dailyCap?: number } = {}) {
    const db = freshDb()
    const transport = fakeTransport()
    const slept: number[] = []
    let clock = Date.UTC(2027, 0, 1, 10)
    const queue = new SendQueue(db, transport, {
      minGapMs: 20_000, maxGapMs: 40_000, dailyCap: options.dailyCap ?? 150,
      now: () => clock,
      sleep: async (ms) => { slept.push(ms); clock += ms },
    })
    const guest = (name: string, phone: string) => createInvitation(db, SECRET, 1, { guestName: name, phone })
    const items = (rows: ReturnType<typeof guest>[]): QueueItem[] => rows.map(r => ({ id: r.id, phone: r.phone, text: `Hi ${r.guest_name}` }))
    const finished = async (campaignId = 1) => { for (let i = 0; i < 200 && queue.progress(campaignId).state === 'running'; i++) await new Promise(r => setImmediate(r)) }
    return { db, transport, queue, slept, guest, items, finished }
  }
  const own: SenderKey = 'campaign-1'

  it('sends to each guest once, marks them sent, and keeps a pause between messages', async () => {
    const t = setup()
    await t.transport.link(own)
    const rows = [t.guest('A', '0501111111'), t.guest('B', '0502222222'), t.guest('C', '0503333333')]
    expect(t.queue.start(1, own, t.items(rows))).toMatchObject({ state: 'running', sender: 'own', total: 3 })
    await t.finished()

    expect(t.queue.progress(1)).toMatchObject({ state: 'done', sent: 3, failed: 0 })
    expect(t.transport.outbox.map(m => [m.phone, m.text])).toEqual([['+972501111111', 'Hi A'], ['+972502222222', 'Hi B'], ['+972503333333', 'Hi C']])
    expect(listInvitations(t.db, 1).every(r => r.sent_at && !r.send_error)).toBe(true)
    expect(t.slept).toHaveLength(2) // no wait before the first, one before each of the others
    expect(t.slept.every(ms => ms >= 20_000 && ms <= 40_000)).toBe(true)
  })

  it('records a failure on that guest and carries on with the rest', async () => {
    const t = setup()
    await t.transport.link(own)
    const rows = [t.guest('Good', '0501111111'), t.guest('Not on WhatsApp', '0500000000'), t.guest('Also good', '0503333333')]
    t.queue.start(1, own, t.items(rows))
    await t.finished()
    expect(t.queue.progress(1)).toMatchObject({ state: 'done', sent: 2, failed: 1 })
    const failed = getById(t.db, 1, rows[1]!.id)
    expect([failed.sent_at, failed.send_error]).toEqual([null, 'This number is not on WhatsApp.'])
    // Correcting the number clears the old error.
    expect(updateInvitation(t.db, 1, failed.id, { phone: '0504444444' }).send_error).toBe('')
  })

  it('stops, without marking anyone, when the account is not linked or drops out', async () => {
    const t = setup()
    const rows = [t.guest('A', '0501111111'), t.guest('B', '0502222222')]
    t.queue.start(1, own, t.items(rows))
    await t.finished()
    expect(t.queue.progress(1)).toMatchObject({ state: 'stopped', sent: 0 })
    expect(t.queue.progress(1).reason).toMatch(/no longer linked/)
    expect(listInvitations(t.db, 1).some(r => r.sent_at)).toBe(false)
  })

  it('skips guests who were sent, deleted or revoked after the run was queued', async () => {
    const t = setup()
    await t.transport.link(own)
    const rows = [t.guest('A', '0501111111'), t.guest('Already sent', '0502222222'), t.guest('Deleted', '0503333333')]
    const queued = t.items(rows)
    updateInvitation(t.db, 1, rows[1]!.id, { sent: true })
    t.db.prepare('DELETE FROM invitations WHERE id = ?').run(rows[2]!.id)
    t.queue.start(1, own, queued)
    await t.finished()
    expect(t.queue.progress(1)).toMatchObject({ state: 'done', total: 1, sent: 1 })
    expect(t.transport.outbox.map(m => m.text)).toEqual(['Hi A'])
  })

  it('respects the daily limit per account and says so', async () => {
    const t = setup({ dailyCap: 2 })
    await t.transport.link(own)
    t.queue.start(1, own, t.items([t.guest('A', '0501111111'), t.guest('B', '0502222222'), t.guest('C', '0503333333')]))
    await t.finished()
    expect(t.queue.progress(1)).toMatchObject({ state: 'stopped', sent: 2 })
    expect(t.queue.progress(1).reason).toMatch(/limit of 2 messages for today/)
    expect(t.queue.remainingToday(own)).toBe(0)
    expect(t.queue.remainingToday('platform')).toBe(2) // other accounts are unaffected
  })

  it('can be stopped, and a second start while running does not double-send', async () => {
    const t = setup()
    await t.transport.link(own)
    const rows = [t.guest('A', '0501111111'), t.guest('B', '0502222222'), t.guest('C', '0503333333')]
    t.queue.start(1, own, t.items(rows))
    expect(t.queue.start(1, own, t.items(rows)).state).toBe('running') // ignored
    t.queue.cancel(1)
    await t.finished()
    expect(t.queue.progress(1).state).toBe('stopped')
    expect(t.transport.outbox.length).toBeLessThan(3)
    expect(new Set(t.transport.outbox.map(m => m.phone)).size).toBe(t.transport.outbox.length)
  })

  it('two campaigns sharing the service account still keep the pace between their messages', async () => {
    const t = setup()
    await t.transport.link('platform')
    t.queue.start(1, 'platform', t.items([t.guest('A', '0501111111')]))
    await t.finished(1)
    t.queue.start(2, 'platform', [{ id: t.guest('B', '0502222222').id, phone: '+972502222222', text: 'Hi B' }])
    await t.finished(2)
    expect(t.transport.outbox).toHaveLength(2)
    expect(t.slept).toHaveLength(1) // the second campaign waited its turn
  })
})

describe('invitation history', () => {
  it('records everything that happens to an invitation, in order, without its link', async () => {
    const db = freshDb()
    const row = createInvitation(db, SECRET, 1, { guestName: 'Dana', phone: '0501111111' })
    const token = tokenOf(row)
    const transport = fakeTransport()
    await transport.link('campaign-1')
    const queue = new SendQueue(db, transport, { minGapMs: 0, maxGapMs: 0, dailyCap: 10 })
    queue.start(1, 'campaign-1', [{ id: row.id, phone: row.phone, text: 'hi' }])
    for (let i = 0; i < 50 && queue.progress(1).state === 'running'; i++) await new Promise(r => setImmediate(r))

    markOpened(db, getByToken(db, token)!)
    markOpened(db, getByToken(db, token)!) // a second visit is not a second "opened"
    submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['Omer'] })
    submitRsvp(db, token, { rsvpStatus: 'attending', extraGuests: ['Omer'] }) // identical: nothing new to record
    submitRsvp(db, token, { rsvpStatus: 'declined' })
    updateInvitation(db, 1, row.id, { guestName: 'Dana Levi', rsvpStatus: 'attending' })
    updateInvitation(db, 1, row.id, { sent: false })
    setRevoked(db, 1, row.id, true)
    regenerateToken(db, SECRET, 1, row.id)

    const history = listEvents(db, 1, row.id).reverse()
    expect(history.map(e => e.kind)).toEqual(['created', 'sent', 'opened', 'answered', 'answered', 'edited', 'unsent', 'link_revoked', 'link_replaced'])
    expect(history[1]!.detail).toBe("Sent automatically from the couple's own WhatsApp")
    expect(history[3]!.detail).toBe('Attending, bringing 1: Omer')
    expect(history[4]!.detail).toBe('Not attending')
    expect(history[5]!.detail).toBe('Changed name to "Dana Levi", answer to attending')
    expect(JSON.stringify(history)).not.toContain(token)
    expect(history.every(e => !Number.isNaN(Date.parse(e.at)))).toBe(true)
  })

  it('records failed sends with the reason, belongs to its campaign, and goes with the invitation', async () => {
    const db = freshDb()
    const row = createInvitation(db, SECRET, 1, { guestName: 'No WhatsApp', phone: '0500000000' })
    const transport = fakeTransport()
    await transport.link('platform')
    const queue = new SendQueue(db, transport, { minGapMs: 0, maxGapMs: 0, dailyCap: 10 })
    queue.start(1, 'platform', [{ id: row.id, phone: row.phone, text: 'hi' }])
    for (let i = 0; i < 50 && queue.progress(1).state === 'running'; i++) await new Promise(r => setImmediate(r))
    expect(listEvents(db, 1, row.id)[0]).toMatchObject({ kind: 'send_failed', detail: "This number is not on WhatsApp. (from the service's WhatsApp)" })
    expect(listEvents(db, 2, row.id)).toEqual([]) // another campaign cannot read it
    deleteInvitation(db, 1, row.id)
    expect(listEvents(db, 1, row.id)).toEqual([])
  })
})
