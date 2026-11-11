import { whatsappOf } from '../../../../../core/campaigns'
import { listInvitations } from '../../../../../core/invitations'

/** Everything the "send by WhatsApp" screen needs: both accounts, who would receive a message, and progress. */
export default apiHandler((event) => {
  const campaign = requireCampaign(event)
  const rows = listInvitations(useDb(), campaign.id).filter(r => !r.sent_at && !r.revoked_at)
  const platform = useWhatsapp().status('platform')
  return {
    own: useWhatsapp().status(ownSender(campaign.id)),
    // Couples learn only whether the shared number is available, not its pairing code.
    platform: { state: platform.state === 'linked' ? 'linked' : 'unlinked', number: platform.number },
    ready: rows.filter(r => r.phone).length,
    withoutPhone: rows.filter(r => !r.phone).length,
    failed: rows.filter(r => r.send_error).length,
    templates: whatsappOf(campaign),
    progress: useSendQueue().progress(campaign.id),
    remainingToday: { own: useSendQueue().remainingToday(ownSender(campaign.id)), platform: useSendQueue().remainingToday('platform') },
  }
})
