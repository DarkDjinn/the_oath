import { commitImport } from '../../../../../core/importer'

export default apiHandler(async (event) => {
  const campaign = requireCampaign(event)
  const { csv, excludedRows } = (await readBody(event)) ?? {}
  if (typeof csv !== 'string') throw createError({ statusCode: 400, message: 'No CSV content received.', data: { code: 'csv_required' } })
  const excluded = Array.isArray(excludedRows) ? excludedRows.filter(Number.isInteger) : []
  const created = commitImport(useDb(), tokenSecret(), campaign.id, csv, excluded)
  return { created: created.map(row => adminView(event, campaign, row)) }
})
