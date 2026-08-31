export type PaginationInput = {
  page?: string | number
  pageSize?: string | number
}

export function parsePagination(input: PaginationInput, defaultPageSize = 10, maxPageSize = 100) {
  const rawPage = typeof input.page === 'string' ? Number(input.page) : Number(input.page)
  const rawPageSize = typeof input.pageSize === 'string' ? Number(input.pageSize) : Number(input.pageSize)

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0 ? Math.floor(rawPageSize) : defaultPageSize
  const safePageSize = Math.min(Math.max(pageSize, 1), maxPageSize)
  const offset = (page - 1) * safePageSize

  return { page, pageSize: safePageSize, offset }
}
