import { createError, readBody } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'
import { buildSlotStartIsosForDate, toIsoNoMs, toMinutes, toUniqueSlotLabels } from '../../utils/booking-slots'
import { generateRecurrenceDates, parseRecurrenceRule, type RecurrenceRule } from '../../utils/booking-recurrence'
import { ensureBookingKeyTokensForBooking, nowIso, recalculateBookingSummary } from '../../utils/booking-v2'
import { ensureBookingLeadTime } from '../../utils/settings'
import { sendEmail } from '../../utils/email'
import { ensureCombinedRoomAvailable, ensureNoCombinedSlotOverlap, slotRangesFromStarts } from '../../utils/combined-rooms'

type CreateBookingBody = {
  roomId?: number
  date?: string // YYYY-MM-DD
  startTime?: string // HH:MM (optional, ignored for compatibility)
  endTime?: string // HH:MM (optional, ignored for compatibility)
  slots?: string[] // HH:MM[]
  recurrence?: {
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
    until?: string // YYYY-MM-DD
    interval?: number
    weeklyDays?: number[] // 0-6 (Sun-Sat)
    monthlyDay?: number // 1-31
    yearlyMonth?: number // 1-12
    yearlyDay?: number // 1-31
  } | null
  activityName?: string
  participantCount?: number
  notes?: string
  requestLetter?: {
    objectKey?: string
    fileName?: string
    contentType?: string
    byteSize?: number
  } | null
}

function hasRecurrencePayload(value: CreateBookingBody['recurrence']): boolean {
  if (!value) return false
  return Boolean(
    value.frequency
      || value.until
      || value.interval !== undefined
      || (Array.isArray(value.weeklyDays) && value.weeklyDays.length > 0)
      || value.monthlyDay !== undefined
      || value.yearlyMonth !== undefined
      || value.yearlyDay !== undefined,
  )
}

function normalizeOptionalText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  return trimmed.length ? trimmed : null
}

async function ensureNoSlotOverlap(db: D1Database, roomId: number, slotStartIsos: string[], slotMinutes: number, message: string): Promise<void> {
  await ensureNoCombinedSlotOverlap(db, roomId, slotRangesFromStarts(slotStartIsos, slotMinutes), message)
}

async function insertOccurrenceWithSlots(

  db: D1Database,

  params: {

    bookingId: number

    occurrenceDate: string

    status: string

    slotStartIsos: string[]

    slotMinutes: number

    actorUserId: number

    at: string

  },

): Promise<number> {

  const { bookingId, occurrenceDate, status, slotStartIsos, slotMinutes, actorUserId, at } = params



  const sortedStarts = [...slotStartIsos].sort((a, b) => a.localeCompare(b))

  const firstStart = sortedStarts[0]



  if (!firstStart) {

    throw createError({ statusCode: 400, statusMessage: 'At least one slot is required' })

  }



  function addMinutesToWibDatetime(value: string, minutes: number): string {

    const match = value.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/)

    if (!match) {

      throw createError({ statusCode: 400, statusMessage: 'Invalid slot datetime' })

    }



    const [, y, mo, d, h, m, sec] = match

    const base = Date.UTC(

      Number(y),

      Number(mo) - 1,

      Number(d),

      Number(h),

      Number(m),

      Number(sec),

    )



    const result = new Date(base + minutes * 60 * 1000)



    const pad = (n: number) => String(n).padStart(2, '0')



    return `${result.getUTCFullYear()}-${pad(result.getUTCMonth() + 1)}-${pad(result.getUTCDate())} ${pad(result.getUTCHours())}:${pad(result.getUTCMinutes())}:${pad(result.getUTCSeconds())}`

  }



  const lastStart = sortedStarts[sortedStarts.length - 1]!

  const lastEnd = addMinutesToWibDatetime(lastStart, slotMinutes)



  const occurrenceRes = await db

    .prepare(

      `INSERT INTO booking_occurrences

         (booking_id, occurrence_date, status, start_at, end_at, created_at, updated_at)

       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)`,

    )

    .bind(bookingId, occurrenceDate, status, firstStart, lastEnd, at)

    .run()



  const occurrenceId = Number(occurrenceRes.meta.last_row_id)



  const slotStatements = [] as ReturnType<D1Database['prepare']>[]



  for (const slotStart of sortedStarts) {

    const slotEnd = addMinutesToWibDatetime(slotStart, slotMinutes)



    slotStatements.push(

      db.prepare(

        `INSERT INTO booking_occurrence_slots (occurrence_id, start_at, end_at)

         VALUES (?1, ?2, ?3)`,

      ).bind(occurrenceId, slotStart, slotEnd),

    )

  }



  if (slotStatements.length) {

    await db.batch(slotStatements)

  }



  await db

    .prepare(

      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)

       VALUES (?1, ?2, ?3, 'created', ?4, ?5)`,

    )

    .bind(bookingId, occurrenceId, actorUserId, JSON.stringify({ occurrenceDate }), at)

    .run()



  return occurrenceId

}


export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as CreateBookingBody
  const roomId = Number(body?.roomId)
  const date = body?.date
  const slots = Array.isArray(body?.slots) ? body?.slots : []
  const uniqueSlots = toUniqueSlotLabels(slots)
  const recurrence = body?.recurrence || null
  const activityName = body?.activityName
  const participantCount = body?.participantCount
  const notes = body?.notes
  const requestLetter = body?.requestLetter || null

  if (!roomId || !date || !uniqueSlots.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'roomId, date, slots are required',
    })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date (expected YYYY-MM-DD)' })
  }
  const at = nowIso()

  const room = await env.DB.prepare(
    `SELECT open_time_start, open_time_end, slot_minutes
     FROM rooms
     WHERE id = ?1 AND deleted_at IS NULL AND COALESCE(available_for_booking, 1) = 1`,
  )
    .bind(roomId)
    .first<{
      open_time_start: string | null
      open_time_end: string | null
      slot_minutes: number | null
    }>()

  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found or not available for booking' })
  }
  await ensureCombinedRoomAvailable(env.DB, roomId)

  const openStart = room.open_time_start || '00:00'
  const openEnd = room.open_time_end || '24:00'
  const slotMinutes = room.slot_minutes || 60

  const openStartMin = toMinutes(openStart)
  const openEndMin = toMinutes(openEnd)

  const hasRecurrence = hasRecurrencePayload(recurrence)

  if (activityName && typeof activityName !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Invalid activityName' })
  }
  if (participantCount !== undefined && participantCount !== null) {
    const count = Number(participantCount)
    if (!Number.isFinite(count) || count < 1) {
      throw createError({ statusCode: 400, statusMessage: 'participantCount must be at least 1' })
    }
  }

  if (requestLetter) {
    const objectKey = String(requestLetter.objectKey || '')
    if (!objectKey.startsWith(`booking-letters/${auth.sub}/`)) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request letter upload' })
    }
    if (requestLetter.contentType !== 'application/pdf') {
      throw createError({ statusCode: 400, statusMessage: 'Surat pengajuan harus berupa PDF' })
    }
    const byteSize = Number(requestLetter.byteSize)
    if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > 6 * 1024 * 1024) {
      throw createError({ statusCode: 400, statusMessage: 'Ukuran surat pengajuan tidak valid' })
    }
  }

  const slotStartIsosByDate = new Map<string, string[]>()
  let singleOccurrenceSlots: string[] = []
  let recurrenceRule: RecurrenceRule | null = null

  if (hasRecurrence) {
    recurrenceRule = parseRecurrenceRule({
      recurrence,
      invalidUntilMessage: 'Invalid recurrence.until (expected YYYY-MM-DD)',
    })

    const dates = generateRecurrenceDates({
      startYmd: date,
      untilYmd: recurrenceRule.until,
      frequency: recurrenceRule.frequency,
      interval: recurrenceRule.interval,
      weeklyDays: recurrenceRule.weeklyDays,
      monthlyDay: recurrenceRule.monthlyDay,
      yearlyMonth: recurrenceRule.yearlyMonth,
      yearlyDay: recurrenceRule.yearlyDay,
      maxOccurrences: 200,
    })

    await ensureBookingLeadTime(env.DB, auth, dates)

    let totalSlotCount = 0
    const allSlotStartIsos: string[] = []

    for (const ymd of dates) {
      const perDate = buildSlotStartIsosForDate({
        ymd,
        slots: uniqueSlots,
        openStartMin,
        openEndMin,
        slotMinutes,
      })
      allSlotStartIsos.push(...perDate)

      totalSlotCount += perDate.length
      if (totalSlotCount > 500) {
        throw createError({ statusCode: 400, statusMessage: 'Too many slots in recurring booking (max 500)' })
      }

      slotStartIsosByDate.set(ymd, perDate)
    }

    // Check overlap with pending/approved booking slots (single query)
    await ensureNoSlotOverlap(env.DB, roomId, allSlotStartIsos, slotMinutes, 'Room is not available in the selected recurring slots')
  } else {
    await ensureBookingLeadTime(env.DB, auth, [date])

    // Non-recurring: slot-based only
    singleOccurrenceSlots = buildSlotStartIsosForDate({
      ymd: date,
      slots: uniqueSlots,
      openStartMin,
      openEndMin,
      slotMinutes,
    })

    await ensureNoSlotOverlap(env.DB, roomId, singleOccurrenceSlots, slotMinutes, 'Room is not available in the selected slots')
  }

  // If current user role is admin, allow direct approval
  let status: 'pending' | 'approved' = 'pending'
  if (hasRole(auth, 'admin')) {
    status = 'approved'
  }

  const normalizedActivityName = normalizeOptionalText(activityName)
  const normalizedNotes = normalizeOptionalText(notes)
  const normalizedParticipantCount =
    participantCount !== undefined && participantCount !== null ? Number(participantCount) : null
  const normalizedRequestLetter = requestLetter
    ? {
        objectKey: String(requestLetter.objectKey || ''),
        fileName: normalizeOptionalText(requestLetter.fileName) || 'surat-pengajuan.pdf',
        contentType: String(requestLetter.contentType || 'application/pdf'),
        byteSize: Number(requestLetter.byteSize),
      }
    : null

  const bookingInsert = await env.DB
    .prepare(
      `INSERT INTO bookings
         (user_id, room_id, status, activity_name, participant_count, notes, is_recurring,
          request_letter_object_key, request_letter_file_name, request_letter_content_type, request_letter_file_size,
          created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?12)`,
    )
    .bind(
      Number(auth.sub),
      roomId,
      status,
      normalizedActivityName,
      normalizedParticipantCount,
      normalizedNotes,
      recurrenceRule ? 1 : 0,
      normalizedRequestLetter?.objectKey || null,
      normalizedRequestLetter?.fileName || null,
      normalizedRequestLetter?.contentType || null,
      normalizedRequestLetter?.byteSize || null,
      at,
    )
    .run()

  const bookingId = Number(bookingInsert.meta.last_row_id)
  const occurrenceIds: number[] = []
  const requester = await env.DB.prepare(
    `SELECT email, fullname FROM users WHERE id = ?1 LIMIT 1`,
  ).bind(Number(auth.sub)).first<{ email: string | null; fullname: string | null }>()

  if (recurrenceRule) {
    const frequency = recurrenceRule!.frequency
    const until = recurrenceRule!.until
    const interval = recurrenceRule!.interval
    const dates = Array.from(slotStartIsosByDate.keys()).sort()

    const seriesRes = await env.DB
      .prepare(
        `INSERT INTO booking_series
           (user_id, room_id, frequency, \`interval\`, start_date, until_date, slots_json, rule_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`,
      )
      .bind(
        Number(auth.sub),
        roomId,
        frequency,
        interval,
        date,
        until,
        JSON.stringify(uniqueSlots),
        JSON.stringify(recurrenceRule),
        at,
      )
      .run()

    const seriesId = Number(seriesRes.meta.last_row_id)

    await env.DB
      .prepare(
        `UPDATE bookings
         SET series_id = ?2,
             updated_at = ?3
         WHERE id = ?1`,
      )
      .bind(bookingId, seriesId, at)
      .run()

    for (const ymd of dates) {
      const starts = slotStartIsosByDate.get(ymd) || []
      const occurrenceId = await insertOccurrenceWithSlots(env.DB, {
        bookingId,
        occurrenceDate: ymd,
        status,
        slotStartIsos: starts,
        slotMinutes,
        actorUserId: Number(auth.sub),
        at,
      })
      occurrenceIds.push(occurrenceId)
    }

    const summary = await recalculateBookingSummary(env.DB, bookingId)
    if (summary.status === 'approved') {
      await ensureBookingKeyTokensForBooking(env.DB, bookingId)
    }
    await sendEmail(env, {
      to: { email: requester?.email, name: requester?.fullname },
      subject: `Peminjaman dibuat: ${normalizedActivityName || `Booking #${bookingId}`}`,
      text: `Peminjaman Anda telah dibuat dengan status ${summary.status}.`,
    })
    return { ok: true, bookingId, seriesId, occurrenceIds, status: summary.status }
  }

  const occurrenceId = await insertOccurrenceWithSlots(env.DB, {
    bookingId,
    occurrenceDate: date,
    status,
    slotStartIsos: singleOccurrenceSlots,
    slotMinutes,
    actorUserId: Number(auth.sub),
    at,
  })
  occurrenceIds.push(occurrenceId)

  const summary = await recalculateBookingSummary(env.DB, bookingId)
  if (summary.status === 'approved') {
    await ensureBookingKeyTokensForBooking(env.DB, bookingId)
  }
  await sendEmail(env, {
    to: { email: requester?.email, name: requester?.fullname },
    subject: `Peminjaman dibuat: ${normalizedActivityName || `Booking #${bookingId}`}`,
    text: `Peminjaman Anda telah dibuat dengan status ${summary.status}.`,
  })
  return { ok: true, bookingId, occurrenceIds, status: summary.status }
})
