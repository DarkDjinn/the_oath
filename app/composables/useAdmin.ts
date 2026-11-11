import { event } from '#shared/event'

/** Readable message from a failed API call. */
export function apiError(error: unknown): string {
  const e = error as { data?: { message?: string }, statusCode?: number }
  if (e?.data?.message) return e.data.message
  return e?.statusCode ? 'The request failed. Please try again.' : 'Could not reach the server. Check your connection and try again.'
}

/** `$fetch` for the admin API: an expired session returns you to sign-in instead of failing silently. */
export async function adminFetch<T>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> {
  try {
    return await $fetch(url, options) as T
  }
  catch (error) {
    if ((error as { statusCode?: number })?.statusCode === 401) await navigateTo('/admin/login')
    throw error
  }
}

/** Copy text and report success, including on browsers without the async clipboard API. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  }
  catch {
    const area = Object.assign(document.createElement('textarea'), { value: text })
    area.style.cssText = 'position:fixed;opacity:0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    return ok
  }
}

/** Timestamps are shown in the event's timezone so the server and every browser render the same text. */
export function formatWhen(iso: string | null): string {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: event.timezone }).format(new Date(iso))
}
