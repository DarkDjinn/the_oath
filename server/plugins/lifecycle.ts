/** Open the database at boot (fails fast on a bad path or missing secret) and close it cleanly on shutdown. */
export default defineNitroPlugin((nitro) => {
  useDb()
  if (!import.meta.dev) tokenSecret()
  nitro.hooks.hook('close', () => closeDb())
})
