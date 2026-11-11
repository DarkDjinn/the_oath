import type { DB } from './db'

/** `{name}` and `{link}` are replaced per invitation. */
export const DEFAULT_WHATSAPP = {
  he: 'שלום {name} ❤️\nאנחנו מתרגשים להזמין אתכם לחגוג איתנו את החתונה שלנו!\nכל פרטי האירוע ואישור ההגעה נמצאים בקישור האישי שלכם:\n{link}',
  en: 'Hi {name} ❤️\nWe would love for you to celebrate our wedding with us!\nAll the details and your RSVP are at your personal link:\n{link}',
}
export type WhatsappTemplates = typeof DEFAULT_WHATSAPP

export function getWhatsappTemplates(db: DB): WhatsappTemplates {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('whatsapp_templates') as { value: string } | undefined
  try { return { ...DEFAULT_WHATSAPP, ...(row ? JSON.parse(row.value) : {}) } }
  catch { return DEFAULT_WHATSAPP }
}

export function setWhatsappTemplates(db: DB, templates: WhatsappTemplates): void {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value')
    .run('whatsapp_templates', JSON.stringify(templates))
}
