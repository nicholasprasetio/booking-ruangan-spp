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

    // Get documents where user is an approver AND it's their turn
    // Also match role-based workflows: approver_role_id matches any of user's roles
    const userRoles = await env.DB.prepare(
      `SELECT role_id FROM user_roles WHERE user_id = ?`
    ).bind(user.sub).all<{ role_id: number }>()
    const userRoleIds = userRoles.results.map(r => r.role_id)

    // Build role filter dynamically
    let roleFilter = 'AND 1=0' // no role match if no roles
    let roleParams: unknown[] = []
    if (userRoleIds.length > 0) {
      const rolePlaceholders = userRoleIds.map(() => '?').join(',')
      roleFilter = `OR (
        w.approver_role_id IN (${rolePlaceholders})
        AND (w.approver_id IS NULL OR w.approver_id = 0)
        AND NOT EXISTS (
          SELECT 1 FROM approval_workflows done
          WHERE done.document_id = d.id
          AND done.level = w.level
          AND done.approver_id = ?
          AND done.approver_role_id = w.approver_role_id
          AND done.status IN ('approved', 'rejected')
        )
      )`
      roleParams = [...userRoleIds, user.sub]
    }

    const totalRow = await env.DB.prepare(
      `SELECT COUNT(DISTINCT d.id) as total 
       FROM approval_documents d
       INNER JOIN approval_workflows w ON d.id = w.document_id
       WHERE (w.approver_id = ? ${roleFilter})
       AND w.status = 'pending'
       AND d.status = 'pending'
       AND NOT EXISTS (
         SELECT 1 FROM approval_workflows prev
         WHERE prev.document_id = d.id
         AND prev.level < w.level
         AND prev.status NOT IN ('approved', 'skipped')
       )
       ${searchFilter}`
    ).bind(user.sub, ...roleParams, ...searchParams).first<{ total: number }>()

    const documents = await env.DB.prepare(
      `SELECT DISTINCT
        d.*,
        u.fullname as creator_name,
        u.email as creator_email,
        w.level as my_level,
        w.status as my_status
       FROM approval_documents d
       INNER JOIN approval_workflows w ON d.id = w.document_id
       LEFT JOIN users u ON d.created_by = u.id
       WHERE (w.approver_id = ? ${roleFilter})
       AND w.status = 'pending'
       AND d.status = 'pending'
       AND NOT EXISTS (
         SELECT 1 FROM approval_workflows prev
         WHERE prev.document_id = d.id
         AND prev.level < w.level
         AND prev.status NOT IN ('approved', 'skipped')
       )
       ${searchFilter}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`
    ).bind(user.sub, ...roleParams, ...searchParams, pageSize, offset).all()

    // Enrich each document with workflows, is_creator
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
      doc.is_creator = doc.created_by === user.sub
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
      statusMessage: error.message || 'Failed to fetch pending approvals',
    })
  }
})
