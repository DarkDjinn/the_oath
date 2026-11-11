/** Fixed-window, in-memory rate limiter. Enough for one process serving one wedding. */
export function createRateLimiter(options: { windowMs: number; max: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>()
  return {
    /** Counts one attempt for `key`. `retryAfter` is seconds until the window resets. */
    hit(key: string, nowMs = Date.now()): { allowed: boolean; retryAfter: number } {
      if (hits.size > 5000) for (const [k, v] of hits) if (v.resetAt <= nowMs) hits.delete(k)
      let entry = hits.get(key)
      if (!entry || entry.resetAt <= nowMs) {
        entry = { count: 0, resetAt: nowMs + options.windowMs }
        hits.set(key, entry)
      }
      entry.count++
      return { allowed: entry.count <= options.max, retryAfter: Math.ceil((entry.resetAt - nowMs) / 1000) }
    },
    reset(key: string) { hits.delete(key) },
  }
}
