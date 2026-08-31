import { createError } from 'h3'
import { requireAuth } from '../../../utils/auth'
import { getCloudflareEnv } from '../../../utils/cf-env'

export default defineEventHandler(async (event) => {
  // const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = getRouterParam(event, 'id')

  console.log('Fetching file for document ID:', id)

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Document ID is required' })
  }

  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  const document = await env.DB.prepare(
    `SELECT id, created_by, file_path, file_name
     FROM approval_documents
     WHERE id = ?`
  ).bind(id).first<any>()

  if (!document) {
    throw createError({ statusCode: 404, statusMessage: 'Document not found' })
  }

  // const isCreator = document.created_by === user.sub
  // let isApprover = false

  // if (!isCreator) {
  //   const workflow = await env.DB.prepare(
  //     `SELECT id FROM approval_workflows WHERE document_id = ? AND approver_id = ? LIMIT 1`
  //   ).bind(id, user.sub).first()
  //   isApprover = Boolean(workflow)
  // }

  // if (!isCreator && !isApprover) {
  //   throw createError({ statusCode: 403, statusMessage: 'Access denied' })
  // }

  const object = await env.R2.get(document.file_path)

  if (!object || !object.body) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' })
  }

  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf')
  headers.set('Content-Disposition', `inline; filename="${document.file_name}"`)
  headers.set('Accept-Ranges', 'bytes')
  if (object.httpMetadata?.cacheControl) {
    headers.set('Cache-Control', object.httpMetadata.cacheControl)
  }

  return new Response(object.body as ReadableStream<any>, {
  headers,
})
})
