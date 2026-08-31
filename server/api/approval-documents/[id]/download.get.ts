import { createError, getRequestURL, setHeader } from 'h3'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { hasRole } from '../../../utils/roles'

function sanitizeFileName(value: string): string {
  return value.replace(/[^\w.\-]+/g, '_')
}

function wrapText(text: string, maxChars: number): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    if (word.length > maxChars) {
      if (current) {
        lines.push(current)
        current = ''
      }
      for (let i = 0; i < word.length; i += maxChars) {
        lines.push(word.slice(i, i + maxChars))
      }
      continue
    }
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      lines.push(current)
      current = word
    } else {
      current = next
    }
  }
  if (current) lines.push(current)
  return lines
}

function formatWorkflowPerson(item: any): string {
  if (item.approver_role_name && (!item.approver_id || Number(item.approver_id) === 0)) {
    return `Role: ${item.approver_role_name}`
  }
  if (item.approver_role_name && item.approver_name) {
    return `${item.approver_name} via role ${item.approver_role_name}`
  }
  return item.approver_name || '-'
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    skipped: 'Dilewati',
  }
  return labels[status] || status || '-'
}

async function embedQrImage(pdfDoc: PDFDocument, verifyUrl: string) {
  try {
    const qrUrl = `https://quickchart.io/qr?size=360&margin=2&text=${encodeURIComponent(verifyUrl)}`
    const response = await fetch(qrUrl)
    if (!response.ok) return null
    const bytes = new Uint8Array(await response.arrayBuffer())
    return await pdfDoc.embedPng(bytes)
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)
  const id = Number(getRouterParam(event, 'id'))
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Document ID is required' })

  const document = await env.DB.prepare(
    `SELECT d.*, u.fullname AS creator_name
     FROM approval_documents d
     LEFT JOIN users u ON u.id = d.created_by
     WHERE d.id = ?1
     LIMIT 1`,
  ).bind(id).first<any>()

  if (!document) throw createError({ statusCode: 404, statusMessage: 'Document not found' })

  const access = Number(document.created_by) === Number(auth.sub)
    || hasRole(auth, 'admin')
    || await env.DB.prepare(
      `SELECT id
       FROM approval_workflows
       WHERE document_id = ?1
         AND approver_id = ?2
       LIMIT 1`,
    ).bind(id, Number(auth.sub)).first<{ id: number }>()

  if (!access) throw createError({ statusCode: 403, statusMessage: 'Forbidden' })

  if (!env.R2) throw createError({ statusCode: 500, statusMessage: 'R2 bucket binding not configured' })
  const object = await env.R2.get(document.file_path)
  if (!object) throw createError({ statusCode: 404, statusMessage: 'Document file not found' })

  let verificationToken = document.verification_token as string | null
  if (!verificationToken) {
    verificationToken = crypto.randomUUID().replace(/-/g, '')
    await env.DB.prepare(
      `UPDATE approval_documents
       SET verification_token = ?2
       WHERE id = ?1`,
    ).bind(id, verificationToken).run()
  }

  const workflows = await env.DB.prepare(
    `SELECT
        w.level,
        w.status,
        w.is_required,
        w.signed_at,
        w.rejection_reason,
        u.fullname AS approver_name,
        u.email AS approver_email,
        r.name AS approver_role_name
     FROM approval_workflows w
     LEFT JOIN users u ON u.id = w.approver_id
     LEFT JOIN roles r ON r.id = w.approver_role_id
     WHERE w.document_id = ?1
     ORDER BY w.level ASC, w.id ASC`,
  ).bind(id).all<any>()

  const history = await env.DB.prepare(
    `SELECT h.action, h.notes, h.created_at, u.fullname AS performer_name
     FROM approval_history h
     LEFT JOIN users u ON u.id = h.performed_by
     WHERE h.document_id = ?1
     ORDER BY h.created_at ASC`,
  ).bind(id).all<any>()

  const bytes = new Uint8Array(await object.arrayBuffer())
  const pdfDoc = await PDFDocument.load(bytes)
  const pageSize = pdfDoc.getPages()[0]?.getSize() || { width: 595.28, height: 841.89 }
  const page = pdfDoc.insertPage(Math.min(1, pdfDoc.getPageCount()), [pageSize.width, pageSize.height])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const width = page.getWidth()
  const height = page.getHeight()
  const origin = getRequestURL(event).origin
  const verifyUrl = `${origin}/verify-document/${verificationToken}`
  const qrImage = await embedQrImage(pdfDoc, verifyUrl)
  let y = height - 54

  page.drawText('Verifikasi dan Workflow Approval', { x: 48, y, size: 18, font: bold, color: rgb(0.08, 0.1, 0.16) })
  y -= 28
  page.drawText(`Dokumen: ${document.title}`, { x: 48, y, size: 11, font: bold })
  y -= 16
  page.drawText(`Status: ${document.status} | Revisi: ${document.revision_number || 1}`, { x: 48, y, size: 10, font })
  y -= 16
  page.drawText(`Pembuat: ${document.creator_name || '-'}`, { x: 48, y, size: 10, font })
  y -= 26

  page.drawText('Workflow Approval', { x: 48, y, size: 12, font: bold, color: rgb(0.08, 0.1, 0.16) })
  y -= 18
  for (const item of workflows.results || []) {
    if (y < 220) break
    const approver = formatWorkflowPerson(item)
    const requiredText = item.is_required ? 'Wajib' : 'Opsional'
    page.drawText(`Level ${item.level} - ${approver}`, { x: 48, y, size: 9, font: bold, color: rgb(0.12, 0.18, 0.28) })
    y -= 13
    page.drawText(`${statusLabel(item.status)} | ${requiredText}${item.signed_at ? ` | Ditandatangani: ${item.signed_at}` : ''}`, { x: 62, y, size: 8, font, color: rgb(0.28, 0.32, 0.38) })
    y -= 12
    if (item.approver_email) {
      page.drawText(item.approver_email, { x: 62, y, size: 8, font, color: rgb(0.35, 0.39, 0.45) })
      y -= 12
    }
    if (item.rejection_reason) {
      for (const line of wrapText(`Alasan: ${item.rejection_reason}`, 92).slice(0, 2)) {
        page.drawText(line, { x: 62, y, size: 8, font, color: rgb(0.7, 0.12, 0.12) })
        y -= 11
      }
    }
    y -= 6
  }

  if (y > 190 && (history.results || []).length) {
    page.drawText('Riwayat Aktivitas', { x: 48, y, size: 12, font: bold, color: rgb(0.08, 0.1, 0.16) })
    y -= 18
  }
  for (const item of history.results || []) {
    if (y < 190) break
    const title = `${item.created_at || '-'} - ${item.action} - ${item.performer_name || '-'}`
    page.drawText(title, { x: 48, y, size: 9, font: bold, color: rgb(0.12, 0.18, 0.28) })
    y -= 13
    for (const line of wrapText(item.notes || '', 92).slice(0, 3)) {
      page.drawText(line, { x: 62, y, size: 8, font, color: rgb(0.28, 0.32, 0.38) })
      y -= 11
    }
    y -= 6
  }

  page.drawRectangle({ x: 48, y: 48, width: width - 96, height: 118, borderColor: rgb(0.75, 0.78, 0.82), borderWidth: 1 })
  page.drawText('QR Verifikasi Dokumen', { x: 62, y: 142, size: 11, font: bold })
  if (qrImage) {
    page.drawImage(qrImage, { x: 62, y: 62, width: 72, height: 72 })
  } else {
    page.drawRectangle({ x: 62, y: 62, width: 72, height: 72, borderColor: rgb(0.55, 0.58, 0.62), borderWidth: 1 })
    page.drawText('QR', { x: 91, y: 96, size: 11, font: bold })
  }
  page.drawText('Scan QR untuk membuka halaman verifikasi publik.', { x: 150, y: 120, size: 8, font })
  page.drawText(`Token: ${verificationToken}`, { x: 150, y: 104, size: 8, font })
  let verifyY = 88
  for (const line of wrapText(verifyUrl, 76).slice(0, 2)) {
    page.drawText(line, { x: 150, y: verifyY, size: 8, font, color: rgb(0.05, 0.3, 0.65) })
    verifyY -= 12
  }

  const out = await pdfDoc.save()
  setHeader(event, 'Content-Type', 'application/pdf')
  setHeader(event, 'Content-Disposition', `attachment; filename="${sanitizeFileName(document.file_name || `document-${id}.pdf`)}"`)
  return out
})
