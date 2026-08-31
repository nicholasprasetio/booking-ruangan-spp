export const emptyToNull = (value: string | null, originalValue: unknown) =>
  originalValue === '' ? null : value

export const emptyNumberToNull = (value: number | null, originalValue: unknown) =>
  originalValue === '' || originalValue === null || Number.isNaN(value) ? null : value

export function buildQuery(page: number, pageSize: number, search?: string, filter?: string) {
  const query:  { page: number; pageSize: number; search?: string; status?: string } = {
    page,
    pageSize,
  }
  if (search?.trim()) query.search = search.trim()
  if (filter && filter !== 'all') query.status = filter
  return query
}
