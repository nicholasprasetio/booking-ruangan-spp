import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { sendEmail } from '../../../utils/email'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')
  // const body = await readBody(event)
  console.log("Testttt")
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form data' })
  }

  // const { signature_data, notes } = body
  const signature_data = formData.find((item) => item.name === 'signature_data')?.data.toString().trim()
  const notes = formData.find((item) => item.name === 'notes')?.data.toString().trim()
  const file = formData.find((item) => item.name === 'file')?.data
  const file_name = formData.find((item) => item.name === 'file_name')?.data.toString().trim()
  const notify_self = formData.find((item) => item.name === 'notify_self')?.data.toString().trim()

  if (!id || !signature_data) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Document ID and signature are required'
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

    if (!file) {
      throw createError({ statusCode: 400, statusMessage: 'File is required' })
    }

    if (!env.R2) {
      throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
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
        statusMessage: 'You are not authorized to approve at this level'
      })
    }

    if (workflow.status !== 'pending') {
      throw createError({
        statusCode: 400,
        statusMessage: 'This approval has already been processed'
      })
    }

    const isRoleWorkflow = Boolean(workflow.approver_role_id && (workflow.approver_id === null || workflow.approver_id === 0))

    if (isRoleWorkflow) {
      const alreadyProcessed = await env.DB.prepare(
        `SELECT id FROM approval_workflows
         WHERE document_id = ?
           AND level = ?
           AND approver_id = ?
           AND approver_role_id = ?
           AND status IN ('approved', 'rejected')
         LIMIT 1`
      ).bind(id, document.current_level, user.sub, workflow.approver_role_id).first<any>()

      if (alreadyProcessed) {
        throw createError({
          statusCode: 400,
          statusMessage: 'This approval has already been processed'
        })
      }
    }

    const fileBytes = new Uint8Array(file) // Uint8Array
    const contentType = 'application/pdf'
    const extension = file_name?.split('.').pop() || 'pdf'
    const objectKey = `approval-documents/${user.sub}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    await env.R2.delete(document.file_path);

    await env.R2.put(objectKey, fileBytes, {
      httpMetadata: { contentType },
    })
    // Update document file path
    await env.DB.prepare(
      `UPDATE approval_documents 
       SET file_path = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(objectKey, id).run()

    let approvedWorkflowId = workflow.id

    if (isRoleWorkflow) {
      const approvalResult = await env.DB.prepare(
        `INSERT INTO approval_workflows
         (document_id, level, approver_id, approver_role_id, is_required, is_checked, status, signature_data, signed_at, notify_preference)
         VALUES (?, ?, ?, ?, 0, 1, 'approved', ?, CURRENT_TIMESTAMP, ?)`
      ).bind(
        id,
        document.current_level,
        user.sub,
        workflow.approver_role_id,
        signature_data,
        ['final', 'all', 'none'].includes(notify_self || '') ? notify_self : 'none',
      ).run()

      approvedWorkflowId = approvalResult.meta.last_row_id
    } else {
      await env.DB.prepare(
        `UPDATE approval_workflows 
         SET status = 'approved', 
             signature_data = ?,
             notify_preference = ?,
             signed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(signature_data, ['final', 'all', 'none'].includes(notify_self || '') ? notify_self : (workflow.notify_preference || 'none'), workflow.id).run()
    }

    // Insert history
    await env.DB.prepare(
      `INSERT INTO approval_history 
       (document_id, workflow_id, action, performed_by, notes)
       VALUES (?, ?, 'approved', ?, ?)`
    ).bind(id, approvedWorkflowId, user.sub, notes || 'Approved and signed').run()

    // Check if level should advance (based on is_required and min_approvals)
    // 1. All REQUIRED approvers at this level must have approved
    const pendingRequired = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM approval_workflows 
       WHERE document_id = ? AND level = ? AND is_required = 1 AND status = 'pending' AND approver_role_id IS NULL`
    ).bind(id, document.current_level).first<{ count: number }>()

    // 2. Check min_approvals from level settings
    const levelSetting = await env.DB.prepare(
      `SELECT min_approvals FROM approval_level_settings 
       WHERE document_id = ? AND level = ?`
    ).bind(id, document.current_level).first<{ min_approvals: number }>()

    const minApprovals = levelSetting?.min_approvals || 0

    // 3. Count total approved at this level
    const approvedAtLevel = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM approval_workflows 
       WHERE document_id = ? AND level = ? AND status = 'approved'`
    ).bind(id, document.current_level).first<{ count: number }>()

    let newStatus = 'pending'
    let newLevel = document.current_level

    const allRequiredDone = pendingRequired && pendingRequired.count === 0
    const meetsMinApprovals = minApprovals === 0 || (approvedAtLevel && approvedAtLevel.count >= minApprovals)

    if (allRequiredDone && meetsMinApprovals) {
      // Skip remaining pending non-required approvers at this level
      await env.DB.prepare(
        `UPDATE approval_workflows 
         SET status = 'skipped', updated_at = CURRENT_TIMESTAMP
         WHERE document_id = ? AND level = ? AND status = 'pending'`
      ).bind(id, document.current_level).run()

      if (document.current_level >= document.total_levels) {
        // All levels completed
        newStatus = 'approved'
        const verificationToken = crypto.randomUUID().replace(/-/g, '')
        await env.DB.prepare(
          `UPDATE approval_documents
           SET verification_token = COALESCE(verification_token, ?2),
               approved_at = COALESCE(approved_at, CURRENT_TIMESTAMP)
           WHERE id = ?1`,
        ).bind(id, verificationToken).run()
      } else {
        // Move to next level
        newLevel = document.current_level + 1
      }

      await env.DB.prepare(
        `UPDATE approval_documents 
         SET status = ?, current_level = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      ).bind(newStatus, newLevel, id).run()

      // Notify next level approvers or creator on full approval
      // if (newStatus === 'approved') {
      //   await notifyDocumentCreator(env, id, 'document_fully_approved',
      //     'Dokumen Disetujui Sepenuhnya',
      //     `Dokumen "${document.title}" telah disetujui oleh semua approver.`)
      // } else if (newLevel > document.current_level) {
      //   await notifyApproversAtLevel(env, id, newLevel, 'approval_needed',
      //     'Dokumen Menunggu Tanda Tangan Anda',
      //     `Dokumen "${document.title}" menunggu persetujuan Anda di level ${newLevel}.`)
      // }
    }

    if (newStatus === 'approved') {
      const creator = await env.DB.prepare(
        `SELECT email, fullname FROM users WHERE id = ?1 LIMIT 1`,
      ).bind(document.created_by).first<{ email: string | null; fullname: string | null }>()
      await sendEmail(env, {
        to: { email: creator?.email, name: creator?.fullname },
        subject: `Dokumen disetujui: ${document.title}`,
        text: `Dokumen "${document.title}" telah disetujui sepenuhnya.`,
      })
    }

    // // Notify document creator that this level was approved
    // if (String(document.created_by) !== String(user.sub)) {
    //   await notifyDocumentCreator(env, id, 'document_approved',
    //     'Dokumen Disetujui',
    //     `Dokumen "${document.title}" telah disetujui di level ${document.current_level}.`)
    // }

    // // Notify self if opted in
    // if (notify_self === '1' || notify_self === 'true') {
    //   await createNotification({
    //     env, userId: user.sub, type: 'document_approved',
    //     title: 'Anda Menyetujui Dokumen',
    //     message: `Anda telah menyetujui dokumen "${document.title}".`,
    //     documentId: id,
    //     documentTitle: document.title,
    //   })
    // }

    return {
      success: true,
      message: 'Document approved and signed successfully',
      next_level: newLevel,
      final_status: newStatus,
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to approve document',
    })
  }
})
