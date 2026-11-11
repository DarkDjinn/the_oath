/** Start linking this campaign's own WhatsApp account; the status then carries a QR code to scan. */
export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  return useWhatsapp().link(ownSender(campaign.id))
})
