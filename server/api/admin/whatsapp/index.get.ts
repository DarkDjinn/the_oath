/** The platform's shared WhatsApp account. Only the owner links it, so only the owner sees its pairing code. */
export default apiHandler((event) => {
  requireOwner(event)
  return useWhatsapp().status('platform')
})
