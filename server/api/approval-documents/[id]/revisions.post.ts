import { createError } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { sendEmail } from '../../../utils/email'

const MAX_PDF_BYTES = 10 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Document ID is required' })

  const previous = await env.DB.prepare(
    `SELECT *
     FROM approval_documents
     WHERE id = ?1
       AND created_by = ?2
     LIMIT 1`,
  ).bind(id, Number(user.sub)).first<any>()

  if (!previous) throw createError({ statusCode: 404, statusMessage: 'Document not found or access denied' })
  if (previous.status !== 'rejected') {
    throw createError({ statusCode: 409, statusMessage: 'Hanya dokumen yang ditolak yang bisa direvisi' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) throw createError({ statusCode: 400, statusMessage: 'Invalid form data' })

  const title = formData.find((item) => item.name === 'title')?.data.toString().trim() || previous.title
  const description = formData.find((item) => item.name === 'description')?.data.toString().trim() || previous.description || ''
  const file = formData.find((item) => item.name === 'file_data' || item.name === 'file')?.data
  const fileName = formData.find((item) => item.name === 'file_name')?.data.toString().trim() || previous.file_name

  if (!file || !fileName) throw createError({ statusCode: 400, statusMessage: 'File revisi wajib diupload' })
  const fileBytes = new Uint8Array(file)
  if (fileBytes.byteLength <= 0 || fileBytes.byteLength > MAX_PDF_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Ukuran file revisi tidak valid' })
  }
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    throw createError({ statusCode: 400, statusMessage: 'File revisi harus PDF' })
  }
  if (!env.R2) throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })

  const extension = fileName.split('.').pop() || 'pdf'
  const objectKey = `approval-documents/${user.sub}/${Date.now()}-${crypto.randomUUID()}.${extension}`
  await env.R2.put(objectKey, fileBytes, {
    httpMetadata: { contentType: 'application/pdf' },
  })

  const revisionNumber = Number(previous.revision_number || 1) + 1

  const existingArchive = await env.DB.prepare(
    `SELECT id
     FROM approval_rejected_files
     WHERE document_id = ?1
       AND revision_number = ?2
       AND file_path = ?3
     LIMIT 1`,
  ).bind(previous.id, Number(previous.revision_number || 1), previous.file_path).first<{ id: number }>()

  if (!existingArchive) {
    const latestRejectHistory = await env.DB.prepare(
      `SELECT id, workflow_id, notes
       FROM approval_history
       WHERE document_id = ?1
         AND action = 'rejected'
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
    ).bind(previous.id).first<any>()

    const archiveResult = await env.DB.prepare(
      `INSERT INTO approval_rejected_files
         (document_id, workflow_id, history_id, file_path, file_name, file_size, revision_number, rejection_reason, rejected_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, CURRENT_TIMESTAMP)`,
    ).bind(
      previous.id,
      latestRejectHistory?.workflow_id || null,
      latestRejectHistory?.id || null,
      previous.file_path,
      previous.file_name,
      previous.file_size,
      Number(previous.revision_number || 1),
      latestRejectHistory?.notes || null,
    ).run()

    if (latestRejectHistory?.id) {
      await env.DB.prepare(
        `UPDATE approval_history
         SET metadata = ?1
         WHERE id = ?2`,
      ).bind(JSON.stringify({ rejected_file_id: Number(archiveResult.meta.last_row_id) }), latestRejectHistory.id).run()
    }
  }

  await env.DB.prepare(
    `DELETE FROM approval_workflows
     WHERE document_id = ?1
       AND approver_role_id IS NOT NULL
       AND is_required = 0
       AND is_checked = 1`,
  ).bind(previous.id).run()

  await env.DB.prepare(
    `UPDATE approval_workflows
     SET status = 'pending',
         signature_data = NULL,
         signed_at = NULL,
         rejection_reason = NULL,
         approver_id = CASE WHEN approver_role_id IS NOT NULL THEN NULL ELSE approver_id END,
         updated_at = CURRENT_TIMESTAMP
     WHERE document_id = ?1`,
  ).bind(previous.id).run()

  await env.DB.prepare(
    `UPDATE approval_documents
     SET title = ?1,
         description = ?2,
         file_path = ?3,
         file_name = ?4,
         file_size = ?5,
         status = 'pending',
         current_level = 1,
         verification_token = NULL,
         approved_at = NULL,
         revision_number = ?6,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?7`,
  ).bind(
    title,
    description || null,
    objectKey,
    fileName,
    fileBytes.byteLength,
    revisionNumber,
    previous.id,
  ).run()

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO approval_history (document_id, action, performed_by, notes, metadata)
       VALUES (?1, 'created', ?2, ?3, ?4)`,
    ).bind(previous.id, Number(user.sub), 'Revision file uploaded', JSON.stringify({ revision_number: revisionNumber, previous_revision_number: Number(previous.revision_number || 1) })),
    env.DB.prepare(
      `INSERT INTO approval_history (document_id, action, performed_by, notes, metadata)
       VALUES (?1, 'revised', ?2, ?3, ?4)`,
    ).bind(previous.id, Number(user.sub), 'Revision submitted for approval from level 1', JSON.stringify({ revision_number: revisionNumber, previous_revision_number: Number(previous.revision_number || 1) })),
  ])

  const firstApprovers = await env.DB.prepare(
    `SELECT DISTINCT u.email, u.fullname
     FROM approval_workflows w
     LEFT JOIN users u ON u.id = w.approver_id
     WHERE w.document_id = ?1
       AND w.level = 1
       AND w.approver_id IS NOT NULL`,
  ).bind(previous.id).all<{ email: string | null; fullname: string | null }>()
  await sendEmail(env, {
    to: firstApprovers.results || [],
    subject: `Revisi dokumen menunggu persetujuan: ${title}`,
    text: `Revisi dokumen "${title}" menunggu persetujuan Anda di level 1.`,
  })

  return {
    success: true,
    message: 'Revision uploaded',
    document_id: previous.id,
    revision_number: revisionNumber,
  }
})
