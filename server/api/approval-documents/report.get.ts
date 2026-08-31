import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const q = getQuery(event)

  const startDate = typeof q.start_date === 'string' ? q.start_date.trim() : ''
  const endDate = typeof q.end_date === 'string' ? q.end_date.trim() : ''
  const status = typeof q.status === 'string' ? q.status.trim() : ''
  const search = typeof q.search === 'string' ? q.search.trim() : ''
  const isAdmin = hasRole(user, 'admin')

  if (!startDate || !endDate) {
    throw createError({ statusCode: 400, statusMessage: 'start_date and end_date are required' })
  }

  const conditions: string[] = ['1=1']
  const binds: unknown[] = []

  // Date range filter
  conditions.push('d.created_at >= ?')
  binds.push(`${startDate}T00:00:00.000Z`)
  conditions.push('d.created_at <= ?')
  binds.push(`${endDate}T23:59:59.999Z`)

  if (status && status !== 'all') {
    conditions.push('d.status = ?')
    binds.push(status)
  }

  if (search) {
    conditions.push('(d.title LIKE ? OR d.description LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`)
  }

  // Access control: admin sees all, non-admin sees related
  const accessFilter = isAdmin
    ? ''
    : 'AND (d.created_by = ? OR w_access.approver_id = ?)'
  const accessParams = isAdmin ? [] : [user.sub, user.sub]

  const accessJoin = isAdmin
    ? ''
    : 'LEFT JOIN approval_workflows w_access ON d.id = w_access.document_id'

  const whereSql = conditions.join(' AND ')

  try {
    // Summary counts
    const summaryResult = await env.DB.prepare(
      `SELECT
          COUNT(DISTINCT d.id) as total,
          COUNT(DISTINCT CASE WHEN d.status = 'draft' THEN d.id END) as draft,
          COUNT(DISTINCT CASE WHEN d.status = 'pending' THEN d.id END) as pending,
          COUNT(DISTINCT CASE WHEN d.status = 'approved' THEN d.id END) as approved,
          COUNT(DISTINCT CASE WHEN d.status = 'rejected' THEN d.id END) as rejected
       FROM approval_documents d
       ${accessJoin}
       WHERE ${whereSql}
       ${accessFilter}`,
    )
      .bind(...binds, ...accessParams)
      .first<{
        total: number
        draft: number
        pending: number
        approved: number
        rejected: number
      }>()

    // Get documents (max 1000)
    const documents = await env.DB.prepare(
      `SELECT DISTINCT
          d.*,
          u.fullname as creator_name,
          u.email as creator_email
       FROM approval_documents d
       LEFT JOIN users u ON d.created_by = u.id
       ${accessJoin}
       WHERE ${whereSql}
       ${accessFilter}
       ORDER BY d.created_at DESC
       LIMIT 1000`,
    )
      .bind(...binds, ...accessParams)
      .all()

    // Enrich with workflows
    for (const doc of documents.results) {
      const workflows = await env.DB.prepare(
        `SELECT
            w.*,
            u.fullname as approver_name,
            u.email as approver_email
         FROM approval_workflows w
         LEFT JOIN users u ON w.approver_id = u.id
         WHERE w.document_id = ?
         ORDER BY w.level ASC`,
      )
        .bind(doc.id)
        .all()

      doc.workflows = workflows.results
      doc.is_creator = doc.created_by === user.sub

      const myWorkflow = workflows.results.find((wf: any) => +wf.approver_id === +user.sub)
      if (myWorkflow) {
        doc.my_level = (myWorkflow as any).level
        doc.my_status = (myWorkflow as any).status
      }
    }

    return {
      ok: true,
      data: documents.results,
      summary: {
        total: summaryResult?.total || 0,
        draft: summaryResult?.draft || 0,
        pending: summaryResult?.pending || 0,
        approved: summaryResult?.approved || 0,
        rejected: summaryResult?.rejected || 0,
      },
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to generate report',
    })
  }
})
