/** Open the database at boot (fails fast on a bad path or missing secret) and close it cleanly on shutdown. */
export default defineNitroPlugin((nitro) => {
  useDb()
  if (!import.meta.dev) tokenSecret()
  // Reconnect WhatsApp accounts that were linked before this start.
  useWhatsapp().restore()
  nitro.hooks.hook('close', () => {
    useWhatsapp().shutdown()
    closeDb()
  })
})
