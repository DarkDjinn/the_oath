export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  useSendQueue().cancel(campaign.id)
  await useWhatsapp().unlink(ownSender(campaign.id))
  return { state: 'unlinked' }
})
