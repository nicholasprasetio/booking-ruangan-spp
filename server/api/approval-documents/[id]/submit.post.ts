import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Document ID is required' })
  }

  try {
    // Get document
    const document = await env.DB.prepare(
      `SELECT * FROM approval_documents WHERE id = ? AND created_by = ?`
    ).bind(id, user.sub).first()

    if (!document) {
      throw createError({ 
        statusCode: 404, 
        statusMessage: 'Document not found or access denied' 
      })
    }

    if (document.status !== 'draft') {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Only draft documents can be submitted' 
      })
    }

    // Update document status
    await env.DB.prepare(
      `UPDATE approval_documents 
       SET status = 'pending', current_level = 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).bind(id).run()

    // Insert history
    await env.DB.prepare(
      `INSERT INTO approval_history 
       (document_id, action, performed_by, notes)
       VALUES (?, 'submitted', ?, ?)`
    ).bind(id, user.sub, 'Document submitted for approval').run()

    // TODO: Send notification to level 1 approvers
    // In production, send email/notification here

    return {
      success: true,
      message: 'Document submitted for approval',
    }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to submit document',
    })
  }
})
