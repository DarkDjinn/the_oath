import { en } from '#shared/i18n/en'
import { he } from '#shared/i18n/he'
import type { Language } from '#shared/types'

const dictionaries = { he, en }

/** Replace `{placeholders}` in a message. */
export function fill(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))
}

/**
 * Lightweight translations. Language is chosen in this order: the guest's own
 * switch (remembered in a cookie), the language set on their invitation, Hebrew.
 */
export function useI18n() {
  const cookie = useCookie<Language | null>('lang', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })
  const lang = useState<Language>('lang', () => (cookie.value === 'en' || cookie.value === 'he' ? cookie.value : 'he'))

  return {
    lang,
    m: computed(() => dictionaries[lang.value]),
    dir: computed(() => (lang.value === 'he' ? 'rtl' : 'ltr')),
    /** Apply an invitation's language unless the guest already chose one themselves. */
    useDefault(language: Language) {
      if (!cookie.value) lang.value = language
    },
    setLang(language: Language) {
      lang.value = language
      cookie.value = language
    },
  }
}
