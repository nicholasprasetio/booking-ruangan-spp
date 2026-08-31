import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Booking } from '~/models/booking'

type ExportLocaleTag = 'id-ID' | 'en-US'

function resolveExportLocale(localeTag?: string): ExportLocaleTag {
  return String(localeTag || '').toLowerCase().startsWith('en') ? 'en-US' : 'id-ID'
}

function formatSlots(b: Booking, localeTag: ExportLocaleTag): string {
  const slots = Array.isArray(b?.slots) ? b.slots : []
  if (!slots.length) {
    const start = b?.start_date ? new Date(b.start_date).toLocaleString(localeTag) : '-'
    const end = b?.end_date ? new Date(b.end_date).toLocaleString(localeTag) : '-'
    return `${start} - ${end}`
  }

  const groups = new Map<string, string[]>()
  for (const s of slots) {
    const start = new Date(s.start_at)
    const end = new Date(s.end_at)
    const dateKey = start.toLocaleDateString(localeTag, { year: 'numeric', month: 'short', day: 'numeric' })
    const timeLabel = `${start.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}-${end.toLocaleTimeString(localeTag, { hour: '2-digit', minute: '2-digit' })}`
    const list = groups.get(dateKey) || []
    list.push(timeLabel)
    groups.set(dateKey, list)
  }
  return Array.from(groups.entries()).map(([d, r]) => `${d}: ${r.join(', ')}`).join(' | ')
}

function statusLabel(status: string, localeTag: ExportLocaleTag): string {
  const labelsId: Record<string, string> = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
    completed: 'Selesai',
    canceled: 'Dibatalkan',
  }
  const labelsEn: Record<string, string> = {
    pending: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed',
    canceled: 'Canceled',
  }
  return (localeTag === 'id-ID' ? labelsId : labelsEn)[status] || status
}

export async function exportBookingsToExcel(
  bookings: Booking[],
  dateRange?: { start: string; end: string },
  localeTag: string = 'id-ID',
) {
  const currentLocale = resolveExportLocale(localeTag)
  const isIndonesian = currentLocale === 'id-ID'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Room Management'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(isIndonesian ? 'Laporan Peminjaman' : 'Booking Report')

  sheet.columns = [
    { header: 'No', key: 'no', width: 6 },
    { header: isIndonesian ? 'Ruangan' : 'Room', key: 'room_name', width: 22 },
    { header: isIndonesian ? 'Kegiatan' : 'Activity', key: 'activity_name', width: 25 },
    { header: isIndonesian ? 'Peminjam' : 'Requester', key: 'user_name', width: 22 },
    { header: 'Email', key: 'user_email', width: 25 },
    { header: isIndonesian ? 'Telepon' : 'Phone', key: 'user_phone', width: 16 },
    { header: isIndonesian ? 'Peserta' : 'Participants', key: 'participant_count', width: 12 },
    { header: isIndonesian ? 'Status' : 'Status', key: 'status', width: 14 },
    { header: isIndonesian ? 'Waktu Slot' : 'Time Slots', key: 'slots', width: 40 },
    { header: isIndonesian ? 'Catatan' : 'Notes', key: 'notes', width: 30 },
    { header: isIndonesian ? 'Tanggal Request' : 'Requested At', key: 'created_at', width: 20 },
  ]

  bookings.forEach((b, idx) => {
    sheet.addRow({
      no: idx + 1,
      room_name: b.room_name || '',
      activity_name: b.activity_name || '',
      user_name: b.user_name || b.fullname || '',
      user_email: b.user_email || '',
      user_phone: b.user_phone || '',
      participant_count: b.participant_count ?? '',
      status: statusLabel(b.status, currentLocale),
      slots: formatSlots(b, currentLocale),
      notes: b.notes || '',
      created_at: b.created_at ? new Date(b.created_at).toLocaleString(currentLocale) : '',
    })
  })

  // Style header
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24

  const fileName = dateRange
    ? `${isIndonesian ? 'laporan_peminjaman' : 'booking_report'}_${dateRange.start}_${dateRange.end}.xlsx`
    : `${isIndonesian ? 'laporan_peminjaman' : 'booking_report'}_${new Date().toISOString().slice(0, 10)}.xlsx`

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, fileName)
}
