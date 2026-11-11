export default apiHandler(async (event) => {
  requireOwner(event)
  return useWhatsapp().link('platform')
})
