import { invitationsCsv, plannerCsv, templateCsv } from '../../../core/exports'

/** GET /api/admin/csv/{invitations|planner|template}.csv. `?ids=1,2,3` narrows the invitations export. */
export default apiHandler((event) => {
  const file = getRouterParam(event, 'file')
  let csv: string
  if (file === 'template.csv') csv = templateCsv()
  else if (file === 'planner.csv') csv = plannerCsv(allAdminViews(event))
  else if (file === 'invitations.csv') {
    const ids = String(getQuery(event).ids ?? '').split(',').map(Number).filter(n => Number.isInteger(n) && n > 0)
    const all = allAdminViews(event)
    csv = invitationsCsv(ids.length ? all.filter(i => ids.includes(i.id)) : all)
  }
  else throw createError({ statusCode: 404, message: 'Not found.' })

  const name = file === 'template.csv' ? 'guest-list-template.csv' : `wedding-${file.replace('.csv', '')}-${new Date().toISOString().slice(0, 10)}.csv`
  setResponseHeaders(event, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}"` })
  return csv
})
