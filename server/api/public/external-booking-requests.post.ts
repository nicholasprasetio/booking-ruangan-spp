import { promises as fs } from 'node:fs'
import path from 'node:path'
import { createError, defineEventHandler, readMultipartFormData } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { nowIso } from '../../utils/booking-v2'
import { getExternalBookingLetterTemplate } from '../../utils/settings'
import {
  buildRequestedSlotIsos,
  buildRequestedSlots,
  ensureNoApprovedOrPendingOverlap,
  ensurePublicBookingLeadTime,
  getRoomForBooking,
  normalizeText,
  requireTime,
  requireYmd,
} from '../../utils/external-booking'

const MAX_PDF_BYTES = 6 * 1024 * 1024
const LETTER_DIR = '/home/jelastic/ROOT/uploads/external-booking-letters'

function fieldText(formData: Awaited<ReturnType<typeof readMultipartFormData>>, name: string): string {
  const item = formData?.find((entry) => entry.name === name)
  return item?.data ? item.data.toString().trim() : ''
}

export default defineEventHandler(async (event) => {
  const env = getCloudflareEnv(event)
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid form data' })
  }

  const requesterName = fieldText(formData, 'requesterName')
  const requesterPhone = fieldText(formData, 'requesterPhone')
  const originEnvironment = fieldText(formData, 'originEnvironment')
  const purpose = fieldText(formData, 'purpose')
  const notes = fieldText(formData, 'notes')
  const date = fieldText(formData, 'date')
  const startTime = fieldText(formData, 'startTime')
  const endTime = fieldText(formData, 'endTime')
  const roomId = Number(fieldText(formData, 'roomId'))
  const participantCount = Number(fieldText(formData, 'participantCount'))

  if (!requesterName || !requesterPhone || !purpose || !roomId || !Number.isFinite(participantCount) || participantCount < 1) {
    throw createError({ statusCode: 400, statusMessage: 'Nama, nomor HP, tujuan, jumlah peserta, dan ruangan wajib diisi' })
  }
  if (requesterName.length > 150 || requesterPhone.length > 40 || purpose.length > 250 || notes.length > 1000 || originEnvironment.length > 150) {
    throw createError({ statusCode: 400, statusMessage: 'Data pengajuan terlalu panjang' })
  }

  requireYmd(date)
  requireTime(startTime, 'startTime')
  requireTime(endTime, 'endTime')
  await ensurePublicBookingLeadTime(env.DB, date)

  const room = await getRoomForBooking(env.DB, roomId)
  if (room.capacity !== null && Number(room.capacity) > 0 && participantCount > Number(room.capacity)) {
    throw createError({ statusCode: 400, statusMessage: `Jumlah peserta melebihi kapasitas ruangan (${room.capacity} orang)` })
  }

  const slotLabels = buildRequestedSlots({ roomId, date, startTime, endTime, room })
  const slotStartIsos = buildRequestedSlotIsos({ roomId, date, startTime, endTime, room })
  await ensureNoApprovedOrPendingOverlap(env.DB, roomId, slotStartIsos, 'Ruangan sudah terisi pada slot waktu tersebut')

  const template = await getExternalBookingLetterTemplate(env.DB)
  const letterFile = formData.find((entry) => entry.name === 'requestLetter' && entry.filename)
  if (template.available && !letterFile) {
    throw createError({ statusCode: 400, statusMessage: 'Surat pengajuan wajib diupload setelah template diisi' })
  }

  let requestLetter: {
    objectKey: string | null
    fileName: string | null
    contentType: string | null
    fileSize: number | null
  } = {
    objectKey: null,
    fileName: null,
    contentType: null,
    fileSize: null,
  }

  if (letterFile) {
    const contentType = normalizeText(letterFile.type) || 'application/pdf'
    if (contentType !== 'application/pdf') {
      throw createError({ statusCode: 400, statusMessage: 'Surat pengajuan harus berupa PDF' })
    }
    if (!letterFile.data?.byteLength || letterFile.data.byteLength > MAX_PDF_BYTES) {
      throw createError({ statusCode: 400, statusMessage: 'Ukuran surat pengajuan tidak valid atau lebih dari 6 MB' })
    }
    await fs.mkdir(LETTER_DIR, { recursive: true })



    const filename = `${crypto.randomUUID()}.pdf`

    const absolutePath = path.join(LETTER_DIR, filename)

    const objectKey = `external-booking-letters/${filename}`



    await fs.writeFile(absolutePath, letterFile.data)



    requestLetter = {

      objectKey,

      fileName: normalizeText(letterFile.filename) || 'surat-pengajuan.pdf',

      contentType,

      fileSize: letterFile.data.byteLength,

    }
  }

  const at = nowIso()
  const result = await env.DB
    .prepare(
      `INSERT INTO external_booking_requests
         (requester_name, requester_phone, origin_environment, purpose, participant_count, notes,
          room_id, request_date, start_time, end_time, slots_json,
          request_letter_object_key, request_letter_file_name, request_letter_content_type, request_letter_file_size,
          status, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, 'pending', ?16, ?16)`,
    )
    .bind(
      requesterName,
      requesterPhone,
      originEnvironment || null,
      purpose,
      participantCount,
      notes || null,
      roomId,
      date,
      startTime,
      endTime,
      JSON.stringify(slotLabels),
      requestLetter.objectKey,
      requestLetter.fileName,
      requestLetter.contentType,
      requestLetter.fileSize,
      at,
    )
    .run()

  return {
    ok: true,
    requestId: Number(result.meta.last_row_id),
    status: 'pending',
  }
})
