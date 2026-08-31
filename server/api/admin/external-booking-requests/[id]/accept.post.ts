import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { nowIso } from '../../../../utils/booking-v2'
import {
  buildRequestedSlotIsos,
  buildRequestedSlots,
  createApprovedBookingFromExternalRequest,
  ensureNoApprovedOrPendingOverlap,
  getRoomForBooking,
  normalizeText,
  requireTime,
  requireYmd,
} from '../../../../utils/external-booking'

type AcceptBody = {
  roomId?: number
  date?: string
  startTime?: string
  endTime?: string
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid request id' })

  const request = await env.DB
    .prepare(
      `SELECT *
       FROM external_booking_requests
       WHERE id = ?1
       LIMIT 1`,
    )
    .bind(id)
    .first<any>()

  if (!request) throw createError({ statusCode: 404, statusMessage: 'Pengajuan external tidak ditemukan' })
  if (request.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Pengajuan ini sudah diproses' })
  }

  const body = (await readBody(event).catch(() => ({}))) as AcceptBody
  const roomId = Number(body?.roomId || request.room_id)
  const date = normalizeText(body?.date || request.request_date)
  const startTime = normalizeText(body?.startTime || request.start_time)
  const endTime = normalizeText(body?.endTime || request.end_time)

  requireYmd(date)
  requireTime(startTime, 'startTime')
  requireTime(endTime, 'endTime')

  const room = await getRoomForBooking(env.DB, roomId)
  if (room.capacity !== null && Number(room.capacity) > 0 && Number(request.participant_count) > Number(room.capacity)) {
    throw createError({ statusCode: 400, statusMessage: `Jumlah peserta melebihi kapasitas ruangan (${room.capacity} orang)` })
  }

  const slotLabels = buildRequestedSlots({ roomId, date, startTime, endTime, room })
  const slotStartIsos = buildRequestedSlotIsos({ roomId, date, startTime, endTime, room })
  await ensureNoApprovedOrPendingOverlap(env.DB, roomId, slotStartIsos, 'Ruangan sudah terisi pada slot waktu tersebut')

  const bookingId = await createApprovedBookingFromExternalRequest(env.DB, {
    externalRequestId: id,
    reviewerUserId: Number(auth.sub),
    requesterName: request.requester_name,
    requesterPhone: request.requester_phone,
    originEnvironment: request.origin_environment || null,
    purpose: request.purpose,
    participantCount: Number(request.participant_count),
    notes: request.notes || null,
    roomId,
    date,
    slotStartIsos,
    slotMinutes: Number(room.slot_minutes || 60),
    requestLetter: {
      objectKey: request.request_letter_object_key || null,
      fileName: request.request_letter_file_name || null,
      contentType: request.request_letter_content_type || null,
      fileSize: request.request_letter_file_size !== null ? Number(request.request_letter_file_size) : null,
    },
  })

  const at = nowIso()
  await env.DB
    .prepare(
      `UPDATE external_booking_requests
       SET status = 'accepted',
           room_id = ?2,
           request_date = ?3,
           start_time = ?4,
           end_time = ?5,
           slots_json = ?6,
           accepted_booking_id = ?7,
           reviewed_by = ?8,
           reviewed_at = ?9,
           updated_at = ?9
       WHERE id = ?1`,
    )
    .bind(id, roomId, date, startTime, endTime, JSON.stringify(slotLabels), bookingId, Number(auth.sub), at)
    .run()

  return { ok: true, requestId: id, bookingId, status: 'accepted' }
})
