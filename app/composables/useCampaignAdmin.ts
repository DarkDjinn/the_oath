import type { InjectionKey, Ref } from 'vue'
import type { AdminCampaign } from '#shared/campaign'

export interface CampaignAdminContext {
  campaign: Ref<AdminCampaign>
  /** Base path of this campaign's admin API, e.g. `/api/admin/c/3`. */
  api: string
  isOwner: boolean
  /** Replace the campaign after a save, so every tab sees the new values. */
  update: (next: AdminCampaign) => void
}
export const campaignAdminKey: InjectionKey<CampaignAdminContext> = Symbol('campaign-admin')

/** The campaign being managed, provided by pages/admin/c/[cid].vue to its tabs. */
export function useCampaignAdmin(): CampaignAdminContext {
  const context = inject(campaignAdminKey)
  if (!context) throw new Error('useCampaignAdmin() must be used inside a campaign admin page.')
  return context
}

/** Display name for a campaign: English names if present, else Hebrew, else its address. */
export function campaignName(c: Pick<AdminCampaign, 'content' | 'slug'>): string {
  const en = c.content.couple.en, he = c.content.couple.he
  if (en.first && en.second) return `${en.first} & ${en.second}`
  if (he.first && he.second) return `${he.first} ו${he.second}`
  return c.slug
}
