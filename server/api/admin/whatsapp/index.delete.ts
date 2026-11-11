export default apiHandler(async (event) => {
  requireOwner(event)
  await useWhatsapp().unlink('platform')
  return { state: 'unlinked' }
})
