import { en } from '#shared/i18n/en'
import { he } from '#shared/i18n/he'
import { ru } from '#shared/i18n/ru'
import { directionOf, isLanguage, type Language } from '#shared/types'

export const dictionaries = { he, en, ru }

/** Replace `{placeholders}` in a message. */
export function fill(text: string, params: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? ''))
}

/**
 * Lightweight translations. Language is chosen in this order: the guest's own
 * switch (remembered in a cookie), the language set on their invitation, the
 * campaign's default. A campaign may enable only one language.
 */
export function useI18n() {
  const cookie = useCookie<Language | null>('lang', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax', path: '/' })
  const lang = useState<Language>('lang', () => (isLanguage(cookie.value) ? cookie.value : 'he'))
  const available = useState<Language[]>('lang-available', () => ['he', 'en'])

  return {
    lang,
    available,
    m: computed(() => dictionaries[lang.value]),
    dir: computed(() => directionOf(lang.value)),
    /** The other languages this campaign offers, each with its own name for the switcher. */
    others: computed(() => available.value.filter(l => l !== lang.value).map(l => ({ id: l, name: dictionaries[l].langName, dir: directionOf(l) }))),
    /** Set what this campaign offers and which language to start in. */
    configure(languages: Language[], preferred?: Language) {
      available.value = languages.length ? languages : ['he']
      const pick = (l?: Language | null) => (l && available.value.includes(l) ? l : null)
      lang.value = pick(cookie.value) ?? pick(preferred) ?? available.value[0]!
    },
    setLang(language: Language) {
      if (!available.value.includes(language)) return
      lang.value = language
      cookie.value = language
    },
  }
}
