import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import type { Room, RoomUpsertPayload } from '~/models/room'

type ExportLocaleTag = 'id-ID' | 'en-US'

function resolveExportLocale(localeTag?: string): ExportLocaleTag {
  return String(localeTag || '').toLowerCase().startsWith('en') ? 'en-US' : 'id-ID'
}

function buildColumns(isIndonesian: boolean) {
  return [
    { header: isIndonesian ? 'Nama Ruangan' : 'Room Name', key: 'name', width: 25 },
    { header: isIndonesian ? 'Lokasi' : 'Location', key: 'location', width: 25 },
    { header: isIndonesian ? 'Kapasitas' : 'Capacity', key: 'capacity', width: 14 },
    { header: isIndonesian ? 'Jam Buka' : 'Open Time', key: 'open_time_start', width: 12 },
    { header: isIndonesian ? 'Jam Tutup' : 'Close Time', key: 'open_time_end', width: 12 },
    { header: isIndonesian ? 'Slot (menit)' : 'Slot (minutes)', key: 'slot_minutes', width: 14 },
    { header: isIndonesian ? 'Tersedia Booking' : 'Available for Booking', key: 'available_for_booking', width: 20 },
    { header: isIndonesian ? 'Deskripsi' : 'Description', key: 'description', width: 40 },
  ]
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4F46E5' },
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  headerRow.height = 24
}

export async function exportRoomsToExcel(rooms: Room[], localeTag: string = 'id-ID') {
  const isIndonesian = resolveExportLocale(localeTag) === 'id-ID'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Room Management'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(isIndonesian ? 'Ruangan' : 'Rooms')
  sheet.columns = buildColumns(isIndonesian)

  for (const room of rooms) {
    sheet.addRow({
      name: room.name || '',
      location: room.location || '',
      capacity: room.capacity ?? '',
      open_time_start: room.open_time_start || '',
      open_time_end: room.open_time_end || '',
      slot_minutes: room.slot_minutes ?? '',
      available_for_booking: room.available_for_booking === false || room.available_for_booking === 0
        ? (isIndonesian ? 'Tidak' : 'No')
        : (isIndonesian ? 'Ya' : 'Yes'),
      description: room.description || '',
    })
  }

  styleHeaderRow(sheet)

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${isIndonesian ? 'ruangan' : 'rooms'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export async function generateRoomTemplate(localeTag: string = 'id-ID') {
  const isIndonesian = resolveExportLocale(localeTag) === 'id-ID'

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Room Management'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet(isIndonesian ? 'Template Ruangan' : 'Room Template')
  sheet.columns = buildColumns(isIndonesian)

  // Example row
  sheet.addRow({
    name: isIndonesian ? 'Aula Utama' : 'Main Hall',
    location: isIndonesian ? 'Lantai 2, Gedung A' : 'Floor 2, Building A',
    capacity: 50,
    open_time_start: '08:00',
    open_time_end: '20:00',
    slot_minutes: 60,
    available_for_booking: isIndonesian ? 'Ya' : 'Yes',
    description: isIndonesian ? 'Ruangan serbaguna untuk berbagai acara' : 'Multi-purpose room for various events',
  })

  styleHeaderRow(sheet)

  // Style the example row with light yellow background
  const exampleRow = sheet.getRow(2)
  exampleRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFFDE7' },
  }
  exampleRow.font = { italic: true, color: { argb: 'FF9E9E9E' } }

  // Add notes sheet
  const notes = workbook.addWorksheet(isIndonesian ? 'Catatan' : 'Notes')
  notes.columns = [
    { header: isIndonesian ? 'Kolom' : 'Column', key: 'col', width: 20 },
    { header: isIndonesian ? 'Keterangan' : 'Description', key: 'desc', width: 50 },
    { header: isIndonesian ? 'Wajib' : 'Required', key: 'required', width: 10 },
  ]

  const noteHeaderRow = notes.getRow(1)
  noteHeaderRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  noteHeaderRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }

  const noteData = isIndonesian
    ? [
      { col: 'Nama Ruangan', desc: 'Nama ruangan (wajib diisi, unik). Jika nama sudah ada, data akan diupdate.', required: 'Ya' },
      { col: 'Lokasi', desc: 'Lokasi ruangan (opsional)', required: 'Tidak' },
      { col: 'Kapasitas', desc: 'Kapasitas orang, angka >= 1', required: 'Tidak' },
      { col: 'Jam Buka', desc: 'Format HH:MM, contoh: 08:00 (harus diisi bersama Jam Tutup)', required: 'Tidak' },
      { col: 'Jam Tutup', desc: 'Format HH:MM, contoh: 20:00 (harus diisi bersama Jam Buka)', required: 'Tidak' },
      { col: 'Slot (menit)', desc: 'Durasi slot booking dalam menit, minimal 15', required: 'Tidak' },
      { col: 'Tersedia Booking', desc: 'Isi Ya/Tidak. Kosong akan dianggap Ya.', required: 'Tidak' },
      { col: 'Deskripsi', desc: 'Deskripsi singkat tentang ruangan', required: 'Tidak' },
    ]
    : [
      { col: 'Room Name', desc: 'Room name (required, unique). If the name already exists, the room will be updated.', required: 'Yes' },
      { col: 'Location', desc: 'Room location (optional)', required: 'No' },
      { col: 'Capacity', desc: 'Capacity (people), number >= 1', required: 'No' },
      { col: 'Open Time', desc: 'HH:MM format, example: 08:00 (must be filled together with Close Time)', required: 'No' },
      { col: 'Close Time', desc: 'HH:MM format, example: 20:00 (must be filled together with Open Time)', required: 'No' },
      { col: 'Slot (minutes)', desc: 'Booking slot duration in minutes, minimum 15', required: 'No' },
      { col: 'Available for Booking', desc: 'Use Yes/No. Blank is treated as Yes.', required: 'No' },
      { col: 'Description', desc: 'Short description about the room', required: 'No' },
    ]
  for (const row of noteData) {
    notes.addRow(row)
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, isIndonesian ? 'template_ruangan.xlsx' : 'room_template.xlsx')
}

export interface ParsedRoom {
  row: number
  data: RoomUpsertPayload
  errors: string[]
  valid: boolean
}

function parseTimeValue(val: unknown): string {
  if (!val) return ''
  const str = String(val).trim()
  // Handle Excel time serial numbers (0-1 range)
  if (/^0?\.\d+$/.test(str) || (!isNaN(Number(str)) && Number(str) > 0 && Number(str) < 1)) {
    const totalMinutes = Math.round(Number(str) * 24 * 60)
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  // Handle date objects
  if (val instanceof Date) {
    return `${String(val.getHours()).padStart(2, '0')}:${String(val.getMinutes()).padStart(2, '0')}`
  }
  // Handle HH:MM format
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(str)) {
    const [h, m] = str.split(':').map(Number)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return str
}

function parseBooleanValue(val: unknown, fallback = true): boolean {
  if (val === null || val === undefined || String(val).trim() === '') return fallback
  const normalized = String(val).trim().toLowerCase()
  if (['ya', 'yes', 'true', '1', 'available', 'tersedia'].includes(normalized)) return true
  if (['tidak', 'no', 'false', '0', 'not available', 'unavailable', 'tidak tersedia'].includes(normalized)) return false
  return fallback
}

export async function parseRoomExcel(file: File, localeTag: string = 'id-ID'): Promise<ParsedRoom[]> {
  const isIndonesian = resolveExportLocale(localeTag) === 'id-ID'

  const workbook = new ExcelJS.Workbook()
  const buffer = await file.arrayBuffer()
  await workbook.xlsx.load(buffer)

  const sheet = workbook.getWorksheet(1)
  if (!sheet) {
    return []
  }

  const results: ParsedRoom[] = []

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const name = row.getCell(1).value
    const location = row.getCell(2).value
    const capacity = row.getCell(3).value
    const open_time_start = row.getCell(4).value
    const open_time_end = row.getCell(5).value
    const slot_minutes = row.getCell(6).value
    const available_for_booking = row.getCell(7).value
    const description = row.getCell(8).value

    // Skip completely empty rows
    const hasAnyValue = [name, location, capacity, open_time_start, open_time_end, slot_minutes, available_for_booking, description].some(
      (v) => v !== null && v !== undefined && String(v).trim() !== '',
    )
    if (!hasAnyValue) return

    const errors: string[] = []
    const nameStr = name ? String(name).trim() : ''
    const locationStr = location ? String(location).trim() : ''
    const descStr = description ? String(description).trim() : ''

    if (!nameStr) {
      errors.push(isIndonesian ? 'Nama Ruangan wajib diisi' : 'Room Name is required')
    }

    let capNum: number | null = null
    if (capacity !== null && capacity !== undefined && String(capacity).trim() !== '') {
      capNum = Number(capacity)
      if (!Number.isFinite(capNum) || capNum < 1) {
        errors.push(isIndonesian ? 'Kapasitas harus angka >= 1' : 'Capacity must be a number >= 1')
        capNum = null
      }
    }

    const timeStart = parseTimeValue(open_time_start)
    const timeEnd = parseTimeValue(open_time_end)

    if ((timeStart && !timeEnd) || (!timeStart && timeEnd)) {
      errors.push(isIndonesian ? 'Jam Buka dan Jam Tutup harus diisi bersamaan' : 'Open Time and Close Time must be filled together')
    }
    if (timeStart && !/^\d{2}:\d{2}$/.test(timeStart)) {
      errors.push(isIndonesian ? 'Format Jam Buka tidak valid (HH:MM)' : 'Invalid Open Time format (HH:MM)')
    }
    if (timeEnd && !/^\d{2}:\d{2}$/.test(timeEnd)) {
      errors.push(isIndonesian ? 'Format Jam Tutup tidak valid (HH:MM)' : 'Invalid Close Time format (HH:MM)')
    }
    if (timeStart && timeEnd && /^\d{2}:\d{2}$/.test(timeStart) && /^\d{2}:\d{2}$/.test(timeEnd)) {
      const [sh, sm] = timeStart.split(':').map(Number)
      const [eh, em] = timeEnd.split(':').map(Number)
      if (sh * 60 + sm >= eh * 60 + em) {
        errors.push(isIndonesian ? 'Jam Tutup harus setelah Jam Buka' : 'Close Time must be after Open Time')
      }
    }

    let slotNum: number | null = null
    if (slot_minutes !== null && slot_minutes !== undefined && String(slot_minutes).trim() !== '') {
      slotNum = Number(slot_minutes)
      if (!Number.isFinite(slotNum) || slotNum < 15) {
        errors.push(isIndonesian ? 'Slot minimal 15 menit' : 'Slot must be at least 15 minutes')
        slotNum = null
      }
    }

    results.push({
      row: rowNumber,
      data: {
        name: nameStr,
        location: locationStr || null,
        capacity: capNum,
        open_time_start: timeStart || null,
        open_time_end: timeEnd || null,
        slot_minutes: slotNum,
        available_for_booking: parseBooleanValue(available_for_booking, true),
        description: descStr || null,
      },
      errors,
      valid: errors.length === 0,
    })
  })

  return results
}
