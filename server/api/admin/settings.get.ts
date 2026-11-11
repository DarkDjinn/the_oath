import { getWhatsappTemplates } from '../../core/settings'

export default apiHandler(() => ({ whatsapp: getWhatsappTemplates(useDb()) }))
