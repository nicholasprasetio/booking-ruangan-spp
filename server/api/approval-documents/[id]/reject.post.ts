import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { sendEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  const { rejection_reason } = body

  if (!id || !rejection_reason) {
    throw createError({ 
      statusCode: 400, 
      statusMessage: 'Document ID and rejection reason are required' 
    })
  }

  try {
    // Get document
    const document = await env.DB.prepare(
      `SELECT * FROM approval_documents WHERE id = ?`
    ).bind(id).first<any>()

    if (!document) {
      throw createError({ statusCode: 404, statusMessage: 'Document not found' })
    }

    if (document.status !== 'pending') {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Document is not in pending status' 
      })
    }

    // Get workflow for current user at current level
    // First try direct approver match
    let workflow = await env.DB.prepare(
      `SELECT * FROM approval_workflows 
       WHERE document_id = ? AND approver_id = ? AND level = ?`
    ).bind(id, user.sub, document.current_level).first<any>()

    // If not found, try role-based match (check all user roles)
    if (!workflow) {
      const userRoles = await env.DB.prepare(
        `SELECT role_id FROM user_roles WHERE user_id = ?`
      ).bind(user.sub).all<{ role_id: number }>()
      const userRoleIds = userRoles.results.map(r => r.role_id)

      for (const roleId of userRoleIds) {
        workflow = await env.DB.prepare(
          `SELECT * FROM approval_workflows 
           WHERE document_id = ? AND approver_role_id = ? AND (approver_id IS NULL OR approver_id = 0) AND level = ? AND status = 'pending'`
        ).bind(id, roleId, document.current_level).first<any>()
        if (workflow) break
      }
    }

    if (!workflow) {
      throw createError({ 
        statusCode: 403, 
        statusMessage: 'You are not authorized to reject at this level' 
      })
    }

    if (workflow.status !== 'pending') {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'This approval has already been processed' 
      })
    }

    // If role-based workflow, claim it by setting the actual rejector
    if (workflow.approver_role_id && (workflow.approver_id === null || workflow.approver_id === 0)) {
      await env.DB.prepare(
        `UPDATE approval_workflows SET approver_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      ).bind(user.sub, workflow.id).run()
    }

    // Update workflow
    await env.DB.prepare(
      `UPDATE approval_workflows 
       SET status = 'rejected', 
           rejection_reason = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(rejection_reason, workflow.id).run()

    // Update document status
    await env.DB.prepare(
      `UPDATE approval_documents 
       SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(id).run()

    // Insert history
    const historyResult = await env.DB.prepare(
      `INSERT INTO approval_history 
       (document_id, workflow_id, action, performed_by, notes)
       VALUES (?, ?, 'rejected', ?, ?)`
    ).bind(id, workflow.id, user.sub, rejection_reason).run()
    const historyId = Number(historyResult.meta.last_row_id)

    const archiveResult = await env.DB.prepare(
      `INSERT INTO approval_rejected_files
         (document_id, workflow_id, history_id, file_path, file_name, file_size, revision_number, rejection_reason, rejected_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)`,
    ).bind(
      Number(id),
      workflow.id,
      historyId,
      document.file_path,
      document.file_name,
      document.file_size,
      Number(document.revision_number || 1),
      rejection_reason,
    ).run()

    await env.DB.prepare(
      `UPDATE approval_history
       SET metadata = ?1
       WHERE id = ?2`,
    ).bind(JSON.stringify({ rejected_file_id: Number(archiveResult.meta.last_row_id) }), historyId).run()

    // TODO: Send notification to document creator
    const creator = await env.DB.prepare(
      `SELECT email, fullname FROM users WHERE id = ?1 LIMIT 1`,
    ).bind(document.created_by).first<{ email: string | null; fullname: string | null }>()
    await sendEmail(env, {
      to: { email: creator?.email, name: creator?.fullname },
      subject: `Dokumen ditolak: ${document.title}`,
      text: `Dokumen "${document.title}" ditolak.\nAlasan: ${rejection_reason}`,
    })

    return {
      success: true,
      message: 'Document rejected',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to reject document',
    })
  }
})
