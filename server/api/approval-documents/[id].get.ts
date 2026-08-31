import { createError } from 'h3'
import { requireAuth } from '../../utils/auth'
import { getCloudflareEnv } from '../../utils/cf-env'

export default defineEventHandler(async (event) => {
  console.log('Fetching approval document details...')
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')
  const buildFileUrl = (docId: number | string) => `/api/approval-documents/${docId}/file`

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Document ID is required' })
  }

  try {
    // Get document
    const document = await env.DB.prepare(
      `SELECT 
        d.*,
        u.fullname as creator_name,
        u.email as creator_email
       FROM approval_documents d
       LEFT JOIN users u ON d.created_by = u.id
       WHERE d.id = ?`
    ).bind(id).first()

    if (!document) {
      throw createError({ statusCode: 404, statusMessage: 'Document not found' })
    }

    // document.file_path = buildFileUrl(Number(document.id))

    // Check access
    // const isCreator = document.created_by === user.sub
    // const isApprover = await env.DB.prepare(
    //   `SELECT COUNT(*) as count FROM approval_workflows 
    //    WHERE document_id = ? AND approver_id = ?`
    // ).bind(id, user.sub).first<{ count: number }>()

    // if (!isCreator && (!isApprover || isApprover.count === 0)) {
    //   throw createError({ statusCode: 403, statusMessage: 'Access denied' })
    // }

    // Get workflows
    const workflows = await env.DB.prepare(
      `SELECT 
        w.*,
        u.fullname as approver_name,
        u.email as approver_email,
        u.phone_number as approver_phone,
        r.name as approver_role_name
       FROM approval_workflows w
       LEFT JOIN users u ON w.approver_id = u.id
       LEFT JOIN roles r ON w.approver_role_id = r.id
       WHERE w.document_id = ?
       ORDER BY w.level ASC, w.id ASC`
    ).bind(id).all()

    document.workflows = workflows.results
    document.final_document_path = buildFileUrl(Number(document.id))

    // Get history
    const history = await env.DB.prepare(
      `SELECT 
        h.*,
        u.fullname as performer_name,
        u.email as performer_email,
        rf.id as rejected_file_id,
        rf.file_name as rejected_file_name,
        rf.revision_number as rejected_file_revision_number
       FROM approval_history h
       LEFT JOIN users u ON h.performed_by = u.id
       LEFT JOIN approval_rejected_files rf ON rf.history_id = h.id
       WHERE h.document_id = ?
       ORDER BY h.created_at DESC`
    ).bind(id).all()

    document.history = history.results

    // Get level settings
    const levelSettings = await env.DB.prepare(
      `SELECT level, min_approvals FROM approval_level_settings
       WHERE document_id = ?
       ORDER BY level ASC`
    ).bind(id).all()

    document.level_settings = levelSettings.results

    return document
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to fetch document',
    })
  }
})
