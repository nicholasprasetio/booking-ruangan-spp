import { createError, getQuery } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.\-]+/g, '_')
}

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Verification token is required' })
  if (!env.R2) throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })

  const document = await env.DB.prepare(
    `SELECT id, title, file_path, file_name, status
     FROM approval_documents
     WHERE verification_token = ?1
     LIMIT 1`,
  ).bind(token).first<{
    id: number
    title: string | null
    file_path: string | null
    file_name: string | null
    status: string
  }>()

  if (!document) throw createError({ statusCode: 404, statusMessage: 'Document verification not found' })
  if (document.status !== 'approved') {
    throw createError({ statusCode: 409, statusMessage: 'Dokumen belum disetujui final' })
  }
  if (!document.file_path) throw createError({ statusCode: 404, statusMessage: 'Final document file not found' })

  const object = await env.R2.get(document.file_path)
  if (!object?.body) throw createError({ statusCode: 404, statusMessage: 'Final document file not found' })

  const query = getQuery(event)
  const disposition = query.download === '1' ? 'attachment' : 'inline'
  const filename = sanitizeFileName(document.file_name || `document-${document.id}.pdf`)
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'application/pdf')
  headers.set('Content-Disposition', `${disposition}; filename="${filename}"`)
  headers.set('Accept-Ranges', 'bytes')
  headers.set('Cache-Control', 'private, max-age=60')

  return new Response(object.body as ReadableStream<any>, { headers })
})
