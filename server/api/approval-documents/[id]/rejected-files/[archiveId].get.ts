import { createError } from 'h3'
import { requireAuth } from '../../../../utils/auth'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { hasRole } from '../../../../utils/roles'

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = Number(getRouterParam(event, 'id'))
  const archiveId = Number(getRouterParam(event, 'archiveId'))

  if (!id || !archiveId) {
    throw createError({ statusCode: 400, statusMessage: 'Document ID and archive ID are required' })
  }
  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  const archive = await env.DB.prepare(
    `SELECT
        rf.*,
        d.created_by
     FROM approval_rejected_files rf
     JOIN approval_documents d ON d.id = rf.document_id
     WHERE rf.id = ?1
       AND rf.document_id = ?2
     LIMIT 1`,
  ).bind(archiveId, id).first<any>()

  if (!archive) {
    throw createError({ statusCode: 404, statusMessage: 'Rejected document archive not found' })
  }

  let canAccess = Number(archive.created_by) === Number(user.sub) || hasRole(user, 'admin')
  if (!canAccess) {
    const directWorkflow = await env.DB.prepare(
      `SELECT id
       FROM approval_workflows
       WHERE document_id = ?1
         AND approver_id = ?2
       LIMIT 1`,
    ).bind(id, Number(user.sub)).first<any>()
    canAccess = Boolean(directWorkflow)
  }
  if (!canAccess) {
    const roleWorkflow = await env.DB.prepare(
      `SELECT w.id
       FROM approval_workflows w
       JOIN user_roles ur ON ur.role_id = w.approver_role_id
       WHERE w.document_id = ?1
         AND ur.user_id = ?2
       LIMIT 1`,
    ).bind(id, Number(user.sub)).first<any>()
    canAccess = Boolean(roleWorkflow)
  }

  if (!canAccess) {
    throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  }

  const object = await env.R2.get(archive.file_path)
  if (!object || !object.body) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf')
  headers.set('Content-Disposition', `inline; filename="${archive.file_name}"`)
  headers.set('Accept-Ranges', 'bytes')

  return new Response(object.body as ReadableStream<any>, { headers })
})
