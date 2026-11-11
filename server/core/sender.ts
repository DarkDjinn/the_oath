import type { LinkStatus, SendProgress } from '../../shared/types'
import type { DB } from './db'
import { recordSend, type InvitationRow } from './invitations'

/**
 * Automatic sending of invitations over a linked WhatsApp account.
 *
 * This file is the queue: who gets a message, in what order, how slowly, and
 * what is recorded. It knows nothing about WhatsApp itself; it talks to a
 * `Transport`, which is the real library in production and a stand-in in tests.
 */

/** A sender is one linked WhatsApp account: a campaign's own, or the platform's shared one. */
export type SenderKey = `campaign-${number}` | 'platform'

export interface Transport {
  status(key: SenderKey): LinkStatus
  /** Resolves once the message is handed to WhatsApp; rejects with a readable reason. */
  send(key: SenderKey, phone: string, text: string): Promise<void>
}

/** Thrown by a transport when the account itself is the problem, so the whole run should stop. */
export class SenderUnavailable extends Error {}

export interface QueueOptions {
  /** Pause between two messages from the same account, chosen at random in this range. */
  minGapMs: number
  maxGapMs: number
  /** Messages one account may send per calendar day. */
  dailyCap: number
  sleep?: (ms: number) => Promise<void>
  now?: () => number
}

export interface QueueItem { id: number, phone: string, text: string }

interface Job extends SendProgress { cancelled: boolean }

const idle = (): SendProgress => ({ state: 'idle', sender: null, total: 0, sent: 0, failed: 0, reason: '', nextAt: null })

export class SendQueue {
  private jobs = new Map<number, Job>()
  /** When each account may send next, so two campaigns sharing the platform number still keep the pace. */
  private nextSlot = new Map<SenderKey, number>()
  private sentToday = new Map<string, number>()

  constructor(private db: DB, private transport: Transport, private options: QueueOptions) {}

  private now = () => (this.options.now ?? Date.now)()
  private sleep = (ms: number) => (this.options.sleep ?? (t => new Promise<void>(r => setTimeout(r, t))))(ms)
  private dayKey = (key: SenderKey) => `${key}:${new Date(this.now()).toISOString().slice(0, 10)}`

  progress(campaignId: number): SendProgress {
    const job = this.jobs.get(campaignId)
    if (!job) return idle()
    const { cancelled: _, ...progress } = job
    return progress
  }

  /** How many more messages this account may send today. */
  remainingToday(key: SenderKey): number {
    return Math.max(0, this.options.dailyCap - (this.sentToday.get(this.dayKey(key)) ?? 0))
  }

  cancel(campaignId: number): void {
    const job = this.jobs.get(campaignId)
    if (job?.state === 'running') job.cancelled = true
  }

  /** Begin sending. Returns at once; the work continues in the background. One run per campaign at a time. */
  start(campaignId: number, key: SenderKey, items: QueueItem[]): SendProgress {
    if (this.jobs.get(campaignId)?.state === 'running') return this.progress(campaignId)
    const job: Job = { state: 'running', sender: key === 'platform' ? 'platform' : 'own', total: items.length, sent: 0, failed: 0, reason: '', nextAt: null, cancelled: false }
    this.jobs.set(campaignId, job)
    void this.run(job, key, items).catch((error) => {
      job.state = 'stopped'
      job.reason = 'Sending stopped unexpectedly. Check the guest list and start again.'
      job.nextAt = null
      console.error('[whatsapp] send run failed:', error instanceof Error ? error.message : error)
    })
    return this.progress(campaignId)
  }

  private stop(job: Job, reason: string) {
    job.state = 'stopped'
    job.reason = reason
    job.nextAt = null
  }

  private async run(job: Job, key: SenderKey, items: QueueItem[]) {
    const via = key === 'platform' ? `the service's WhatsApp` : `the couple's own WhatsApp`
    for (const item of items) {
      // Keep the pace per account, including right after another campaign used the same one.
      const wait = (this.nextSlot.get(key) ?? 0) - this.now()
      if (wait > 0) {
        job.nextAt = new Date(this.now() + wait).toISOString()
        await this.sleep(wait)
      }
      job.nextAt = null
      if (job.cancelled) return this.stop(job, 'Stopped by you.')
      if (this.remainingToday(key) <= 0) return this.stop(job, `This WhatsApp account reached its limit of ${this.options.dailyCap} messages for today. Send the rest tomorrow.`)
      if (this.transport.status(key).state !== 'linked') return this.stop(job, 'The WhatsApp account is no longer linked. Link it again and send the rest.')

      // The guest list may have changed since the run began: skip anyone deleted, revoked or already sent.
      const row = this.db.prepare('SELECT * FROM invitations WHERE id = ?').get(item.id) as InvitationRow | undefined
      if (!row || row.revoked_at || row.sent_at) { job.total--; continue }

      try {
        await this.transport.send(key, item.phone, item.text)
        recordSend(this.db, item.id, null, via)
        job.sent++
        this.sentToday.set(this.dayKey(key), (this.sentToday.get(this.dayKey(key)) ?? 0) + 1)
      }
      catch (error) {
        if (error instanceof SenderUnavailable) return this.stop(job, error.message)
        recordSend(this.db, item.id, error instanceof Error ? error.message : 'Could not be sent.', via)
        job.failed++
      }
      const gap = this.options.minGapMs + Math.random() * (this.options.maxGapMs - this.options.minGapMs)
      this.nextSlot.set(key, this.now() + gap)
    }
    job.state = 'done'
    job.nextAt = null
  }
}
