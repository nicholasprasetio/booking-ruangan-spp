import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { ApprovalDocument } from '~/models/approval-document'

type ExportLocaleTag = 'id-ID' | 'en-US'

function resolveExportLocale(localeTag?: string): ExportLocaleTag {
  return String(localeTag || '').toLowerCase().startsWith('en') ? 'en-US' : 'id-ID'
}

function statusLabel(status: string, localeTag: ExportLocaleTag): string {
  const labelsId: Record<string, string> = {
    draft: 'Draft',
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  }
  const labelsEn: Record<string, string> = {
    draft: 'Draft',
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  }
  return (localeTag === 'id-ID' ? labelsId : labelsEn)[status] || status
}

export async function exportDocumentsToExcel(
  documents: ApprovalDocument[],
  dateRange?: { start: string; end: string },
  localeTag: string = 'id-ID',
) {
  const currentLocale = resolveExportLocale(localeTag)
  const isIndonesian = currentLocale === 'id-ID'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Room Management'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(isIndonesian ? 'Laporan Dokumen' : 'Document Report')

  sheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: isIndonesian ? 'Judul' : 'Title', key: 'title', width: 30 },
    { header: isIndonesian ? 'Deskripsi' : 'Description', key: 'description', width: 35 },
    { header: isIndonesian ? 'Pembuat' : 'Creator', key: 'creator_name', width: 22 },
    { header: isIndonesian ? 'Status' : 'Status', key: 'status', width: 14 },
    { header: isIndonesian ? 'Level Saat Ini' : 'Current Level', key: 'current_level', width: 14 },
    { header: isIndonesian ? 'Total Level' : 'Total Levels', key: 'total_levels', width: 12 },
    { header: 'Approver(s)', key: 'approvers', width: 40 },
    { header: isIndonesian ? 'Tanggal Dibuat' : 'Created At', key: 'created_at', width: 20 },
    { header: isIndonesian ? 'Terakhir Diupdate' : 'Last Updated', key: 'updated_at', width: 20 },
  ]

  documents.forEach((doc, idx) => {
    const approvers = (doc.workflows || [])
      .map((w) => `L${w.level}-${w.approver_name || (isIndonesian ? 'Tidak diketahui' : 'Unknown')}(${statusLabel(w.status, currentLocale)})`)
      .join(', ')

    sheet.addRow({
      no: idx + 1,
      title: doc.title || '',
      description: doc.description || '',
      creator_name: doc.creator_name || '',
      status: statusLabel(doc.status, currentLocale),
      current_level: doc.current_level ?? '',
      total_levels: doc.total_levels ?? '',
      approvers,
      created_at: doc.created_at ? new Date(doc.created_at).toLocaleString(currentLocale) : '',
      updated_at: doc.updated_at ? new Date(doc.updated_at).toLocaleString(currentLocale) : '',
    })
  })

  // Style header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  const fileName = dateRange
    ? `${isIndonesian ? 'laporan_dokumen' : 'document_report'}_${dateRange.start}_${dateRange.end}.xlsx`
    : `${isIndonesian ? 'laporan_dokumen' : 'document_report'}_${new Date().toISOString().slice(0, 10)}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}
