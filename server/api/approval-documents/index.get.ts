import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { parsePagination } from '../../utils/pagination'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const query = getQuery(event)
  const { page, pageSize, offset } = parsePagination(query)
  const search = (query.search as string || '').trim()
  const createFileUrl = (docId: number | string) => `/api/approval-documents/${docId}/file`

  try {
    const searchFilter = search
      ? `AND (d.title LIKE ? OR d.description LIKE ?)`
      : ''
    const searchParams = search ? [`%${search}%`, `%${search}%`] : []

    // Get documents created by user
    const totalRow = await env.DB.prepare(
      `SELECT COUNT(*) as total FROM approval_documents d
       WHERE d.created_by = ?
       ${searchFilter}`
    ).bind(user.sub, ...searchParams).first<{ total: number }>()

    const documents = await env.DB.prepare(
      `SELECT 
        d.*,
        u.fullname as creator_name,
        u.email as creator_email
       FROM approval_documents d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.created_by = ?
       ${searchFilter}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(user.sub, ...searchParams, pageSize, offset).all()

    // Enrich each document with workflows, is_creator, my_level, my_status
    for (const doc of documents.results) {
      const workflows = await env.DB.prepare(
        `SELECT 
          w.*,
          u.fullname as approver_name,
          u.email as approver_email,
          r.name as approver_role_name
         FROM approval_workflows w
         LEFT JOIN users u ON w.approver_id = u.id
         LEFT JOIN roles r ON w.approver_role_id = r.id
         WHERE w.document_id = ?
         ORDER BY w.level ASC`
      ).bind(doc.id).all()

      doc.workflows = workflows.results
      doc.file_path = createFileUrl(Number(doc.id))
      doc.is_creator = true

      const myWorkflow = workflows.results.find((wf: any) => wf.approver_id === user.sub)
      if (myWorkflow) {
        doc.my_level = (myWorkflow as any).level
        doc.my_status = (myWorkflow as any).status
      }
    }

    return {
      data: documents.results,
      meta: {
        total: totalRow?.total || 0,
        page,
        pageSize,
        offset,
        total_pages: Math.ceil((totalRow?.total || 0) / pageSize),
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch documents',
    })
  }
})
