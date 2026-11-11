export default defineEventHandler(() => {
  useDb().prepare('SELECT 1').get()
  return { ok: true }
})
