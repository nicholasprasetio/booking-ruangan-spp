import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const token = String(getRouterParam(event, 'token') || '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Verification token is required' })

  const row = await env.DB.prepare(
    `SELECT
        d.id,
        d.title,
        d.file_name,
        d.status,
        d.revision_number,
        d.approved_at,
        d.created_at,
        d.updated_at,
        u.fullname AS creator_name
     FROM approval_documents d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE d.verification_token = ?1
     LIMIT 1`,
  ).bind(token).first<any>()

  if (!row) throw createError({ statusCode: 404, statusMessage: 'Document verification not found' })

  return {
    ok: true,
    valid: row.status === 'approved',
    document: row,
    fileUrl: row.status === 'approved' ? `/api/public/document-verifications/${encodeURIComponent(token)}/file` : null,
    downloadUrl: row.status === 'approved' ? `/api/public/document-verifications/${encodeURIComponent(token)}/file?download=1` : null,
  }
})
