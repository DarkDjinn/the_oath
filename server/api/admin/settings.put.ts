import { DEFAULT_WHATSAPP, getWhatsappTemplates, setWhatsappTemplates } from '../../core/settings'
import { ValidationError } from '../../core/errors'

export default apiHandler(async (event) => {
  const { whatsapp } = (await readBody(event)) ?? {}
  const next = { ...DEFAULT_WHATSAPP }
  for (const lang of ['he', 'en'] as const) {
    const text = whatsapp?.[lang]
    if (typeof text !== 'string' || !text.trim() || text.length > 2000) throw new ValidationError('template_invalid', 'Each message needs some text, up to 2000 characters.')
    if (!text.includes('{link}')) throw new ValidationError('template_no_link', 'Each message must contain {link} so the guest receives their invitation.')
    next[lang] = text
  }
  setWhatsappTemplates(useDb(), next)
  return { whatsapp: getWhatsappTemplates(useDb()) }
})
