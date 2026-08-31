import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { sendEmail } from '../../utils/email'

function decodeFileDataUrl(fileData: string) {
  const match = fileData.match(/^data:(?<mime>[^;]+);base64,(?<payload>.+)$/)
  if (!match || !match.groups) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid file data payload' })
  }

  const { mime, payload } = match.groups
  const bytes = base64ToUint8Array(payload)

  return {
    contentType: mime || 'application/octet-stream',
    bytes,
  }
}

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(base64, 'base64')
  }

  const binary = atob(base64)
  const length = binary.length
  const bytes = new Uint8Array(length)

  for (let i = 0; i < length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const MAX_PHOTO_BYTES = 6 * 1024 * 1024

export default defineEventHandler(async (event) => {
  const user = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form data' })
  }
  // console.log('body', body)

  // const title = formData.find((item) => item.name === 'title')?.data 
  const title = formData.find((item) => item.name === 'title')?.data.toString().trim()
  const description = formData.find((item) => item.name === 'description')?.data.toString().trim()
  const file_data = formData.find((item) => item.name === 'file_data')?.data
  const file_name = formData.find((item) => item.name === 'file_name')?.data.toString().trim()
  const approversData = formData.find((item) => item.name === 'approvers')?.data.toString().trim()
  const levelSettingsData = formData.find((item) => item.name === 'level_settings')?.data.toString().trim()
  let approvers: Array<any> = []
  let levelSettings: Array<any> = []


  // console.log('file_data', file_data)

  // console.log('is file data a string?', typeof file_data === )
  // return;

  // const approversJson =
  //   typeof approversData === 'string'
  //     ? approversData
  //     : new TextDecoder().decode(approversData)

  approvers = JSON.parse(approversData || '[]')
  levelSettings = JSON.parse(levelSettingsData || '[]')
  if (!title || !file_data || !file_name || !approvers || approvers.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  if (!file_data) {
    throw createError({ statusCode: 400, statusMessage: 'File is required' })
  }
  // const fileData = JSON.parse(file_data)
  const fileBytes = new Uint8Array(file_data) // Uint8Array
  const contentType = 'application/pdf'


  if (fileBytes.byteLength > MAX_PHOTO_BYTES) {
    throw createError({
      statusCode: 400,
      statusMessage: 'File size exceeds limit',
    })
  }

  if (!env.R2) {
    throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  }

  try {
    const extension = file_name?.split('.').pop() || 'pdf'
    const objectKey = `approval-documents/${user.sub}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    // const { contentType, bytes } = decodeFileDataUrl(file_data)
    // const extension = file_name?.split('.').pop() || 'pdf'
    // const objectKey = `approval-documents/${user.sub}/${Date.now()}-${crypto.randomUUID()}.${extension}`

    await env.R2.put(objectKey, fileBytes, {
      httpMetadata: { contentType },
    })

    const total_levels = Math.max(...approvers.map((a: any) => a.level))

    // Insert document
    const docResult = await env.DB.prepare(
      `INSERT INTO approval_documents 
       (title, description, file_path, file_name, file_size, created_by, status, total_levels, current_level)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, 1)`
    ).bind(
      title,
      description || null,
      objectKey,
      file_name,
      fileBytes.byteLength,
      user.sub,
      total_levels,
    ).run()

    const documentId = docResult.meta.last_row_id
    await env.DB.prepare(
      `UPDATE approval_documents
       SET root_document_id = ?1
       WHERE id = ?1`,
    ).bind(documentId).run()
    console.log('Created document with ID:', documentId)
    console.log('Approvers for document ID', documentId, approvers)
    // Insert workflows
    for (const approver of approvers) {
      await env.DB.prepare(
        `INSERT INTO approval_workflows 
         (document_id, level, approver_id, approver_role_id, is_required, is_checked, status, notify_preference)
         VALUES (?, ?, ?, ?, ?, 1, 'pending', ?)`
      ).bind(
        documentId,
        approver.level,
        approver.approver_role_id ? null : approver.approver_id,
        approver.approver_role_id || null,
        approver.is_required ? 1 : 0,
        ['final', 'all', 'none'].includes(approver.notify_preference) ? approver.notify_preference : 'none',
      ).run()
    }
    console.log('Inserted workflows for document ID:', documentId)
    // Insert level settings
    for (const setting of levelSettings) {
      if (setting.level && setting.min_approvals >= 0) {
        await env.DB.prepare(
          `INSERT OR REPLACE INTO approval_level_settings 
           (document_id, level, min_approvals)
           VALUES (?, ?, ?)`
        ).bind(documentId, setting.level, setting.min_approvals).run()
      }
    }

    // Insert history
    await env.DB.prepare(
      `INSERT INTO approval_history 
       (document_id, action, performed_by, notes)
       VALUES (?, 'created', ?, ?)`
    ).bind(documentId, user.sub, `Document created: ${title}`).run()

    const firstApprovers = await env.DB.prepare(
      `SELECT DISTINCT u.email, u.fullname
       FROM approval_workflows w
       LEFT JOIN users u ON u.id = w.approver_id
       WHERE w.document_id = ?1
         AND w.level = 1
         AND w.approver_id IS NOT NULL`,
    ).bind(documentId).all<{ email: string | null; fullname: string | null }>()
    await sendEmail(env, {
      to: firstApprovers.results || [],
      subject: `Dokumen menunggu persetujuan: ${title}`,
      text: `Dokumen "${title}" menunggu persetujuan Anda di level 1.`,
    })

    return {
      success: true,
      message: 'Document created successfully',
      document_id: documentId,
    }
  } catch (error: any) {
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Failed to create document',
    })
  }
})
