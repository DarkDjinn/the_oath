import { commitImport } from '../../../core/importer'

export default apiHandler(async (event) => {
  const { csv, excludedRows } = (await readBody(event)) ?? {}
  if (typeof csv !== 'string') throw createError({ statusCode: 400, message: 'No CSV content received.', data: { code: 'csv_required' } })
  const excluded = Array.isArray(excludedRows) ? excludedRows.filter(Number.isInteger) : []
  const created = commitImport(useDb(), tokenSecret(), csv, excluded)
  return { created: created.map(row => adminView(event, row)) }
})
