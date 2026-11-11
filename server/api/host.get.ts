/**
 * Tells the front page what this hostname is: a campaign's subdomain (`slug`),
 * a subdomain nobody has (`unknown`), or the platform's own address (neither).
 */
export default apiHandler((event) => {
  const base = baseDomain(), host = requestHost(event)
  const slug = campaignFromHost(event)?.slug ?? null
  return { slug, unknown: !slug && !!base && host.endsWith(`.${base}`) }
})
