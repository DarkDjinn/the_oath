import { whatsappOf } from '../../../../../core/campaigns'
import { deriveToken } from '../../../../../core/tokens'
import { listInvitations } from '../../../../../core/invitations'

/**
 * Send the invitation to every guest who has a phone number and has not been sent one.
 * `sender` is "own" (the campaign's linked account) or "platform" (the shared one).
 * Returns at once; messages go out slowly in the background.
 */
export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  const body = (await readBody(event)) ?? {}
  if (campaign.status !== 'live') throw createError({ statusCode: 400, message: 'The campaign must be live before invitations are sent, or guests would open a link that is not open yet.', data: { code: 'campaign_not_live' } })
  const key = body.sender === 'platform' ? 'platform' as const : ownSender(campaign.id)
  if (useWhatsapp().status(key).state !== 'linked') throw createError({ statusCode: 400, message: 'That WhatsApp account is not linked.', data: { code: 'sender_not_linked' } })

  const templates = whatsappOf(campaign), base = linkBase(event, campaign), secret = tokenSecret()
  const items = listInvitations(useDb(), campaign.id)
    .filter(r => !r.sent_at && !r.revoked_at && r.phone)
    .map(r => ({
      id: r.id,
      phone: r.phone,
      text: (templates[r.language] ?? templates.he).replaceAll('{name}', r.guest_name).replaceAll('{link}', `${base}/i/${deriveToken(secret, r.token_nonce)}`),
    }))
  if (!items.length) throw createError({ statusCode: 400, message: 'There is nobody to send to: every guest with a phone number already has their invitation.', data: { code: 'nothing_to_send' } })
  return useSendQueue().start(campaign.id, key, items)
})
