/** Stop a running send. Messages already sent stay sent. */
export default apiHandler((event) => {
  const campaign = requireCampaign(event)
  useSendQueue().cancel(campaign.id)
  return useSendQueue().progress(campaign.id)
})
