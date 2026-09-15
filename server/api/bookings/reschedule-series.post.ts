import { createError, readBody } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'
import { buildSlotStartIsosForDate, toIsoNoMs, toMinutes, toUniqueSlotLabels } from '../../utils/booking-slots'
import { generateRecurrenceDates, parseRecurrenceRule } from '../../utils/booking-recurrence'
import { getOccurrenceSlotsMap, nowIso, recalculateBookingSummary, requireBookingAccess } from '../../utils/booking-v2'
import { ensureBookingLeadTime } from '../../utils/settings'
import { ensureCombinedRoomAvailable, ensureNoCombinedSlotOverlap, slotRangesFromStarts } from '../../utils/combined-rooms'

type RescheduleSeriesBody = {
  bookingId?: number
  seriesId?: number
  startDate?: string
  recurrence?: {
    frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly'
    until?: string
    interval?: number
    weeklyDays?: number[]
    monthlyDay?: number
    yearlyMonth?: number
    yearlyDay?: number
  } | null
  slots?: string[]
  activityName?: string
  participantCount?: number
  notes?: string
  reason?: string
}

function normalizeOptionalText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  return trimmed.length ? trimmed : null
}

async function resolveBookingId(db: D1Database, body: RescheduleSeriesBody): Promise<number> {
  const direct = Number(body?.bookingId)
  if (direct) return direct

  const legacySeriesId = Number(body?.seriesId)
  if (!legacySeriesId) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid bookingId' })
  }

  const booking = await db
    .prepare(
      `SELECT id
       FROM bookings
       WHERE series_id = ?1
         AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(legacySeriesId)
    .first<{ id: number }>()

  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  return Number(booking.id)
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as RescheduleSeriesBody
  const bookingId = await resolveBookingId(env.DB, body)

  const startDate = typeof body?.startDate === 'string' ? body.startDate : ''
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid startDate (expected YYYY-MM-DD)' })
  }

  const recurrenceRule = parseRecurrenceRule({
    recurrence: body?.recurrence || null,
    requireFrequencyAndUntilMessage: 'recurrence.frequency and recurrence.until are required',
  })

  const uniqueSlots = toUniqueSlotLabels(Array.isArray(body?.slots) ? body.slots : [])
  if (!uniqueSlots.length) {
    throw createError({ statusCode: 400, statusMessage: 'slots is required' })
  }

  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (reason.length > 500) throw createError({ statusCode: 400, statusMessage: 'Reason is too long' })

  const booking = await requireBookingAccess(env.DB, bookingId, Number(auth.sub), hasRole(auth, 'admin'))

  const room = await env.DB
    .prepare(
      `SELECT open_time_start, open_time_end, slot_minutes
       FROM rooms
       WHERE id = ?1 AND deleted_at IS NULL AND COALESCE(available_for_booking, 1) = 1`,
    )
    .bind(Number(booking.room_id))
    .first<{ open_time_start: string | null; open_time_end: string | null; slot_minutes: number | null }>()

  if (!room) throw createError({ statusCode: 404, statusMessage: 'Room not found or not available for booking' })
  await ensureCombinedRoomAvailable(env.DB, Number(booking.room_id))

  const openStartMin = toMinutes(room.open_time_start || '00:00')
  const openEndMin = toMinutes(room.open_time_end || '24:00')
  const slotMinutes = room.slot_minutes || 60

  const dates = generateRecurrenceDates({
    startYmd: startDate,
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

  const slotStartIsosByDate = new Map<string, string[]>()
  const allSlotStarts: string[] = []
  let totalSlotCount = 0
  const at = nowIso()
  const stepMs = slotMinutes * 60 * 1000

  for (const ymd of dates) {
    const starts = buildSlotStartIsosForDate({
      ymd,
      slots: uniqueSlots,
      openStartMin,
      openEndMin,
      slotMinutes,
    })
    const sortedStarts = [...starts].sort((a, b) => a.localeCompare(b))
    if (sortedStarts.length) {
      const lastEnd = toIsoNoMs(new Date(new Date(sortedStarts[sortedStarts.length - 1]!).getTime() + stepMs))
      if (lastEnd < at) {
        throw createError({ statusCode: 409, statusMessage: 'Jadwal baru tidak boleh sudah lewat' })
      }
    }

    slotStartIsosByDate.set(ymd, sortedStarts)
    allSlotStarts.push(...sortedStarts)

    totalSlotCount += sortedStarts.length
    if (totalSlotCount > 500) {
      throw createError({ statusCode: 400, statusMessage: 'Too many total slots (max 500)' })
    }
  }

  await ensureNoCombinedSlotOverlap(
    env.DB, Number(booking.room_id), slotRangesFromStarts(allSlotStarts, slotMinutes),
    'Room is not available in the selected recurring slots', { excludeBookingId: bookingId },
  )

  if (body?.participantCount !== undefined && body?.participantCount !== null) {
    const count = Number(body.participantCount)
    if (!Number.isFinite(count) || count < 1) {
      throw createError({ statusCode: 400, statusMessage: 'participantCount must be at least 1' })
    }
  }

  let seriesId = Number(booking.series_id || 0)
  if (!seriesId) {
    const seriesRes = await env.DB
      .prepare(
        `INSERT INTO booking_series
           (user_id, room_id, frequency, \`interval\`, start_date, until_date, slots_json, rule_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`,
      )
      .bind(
        Number(booking.user_id),
        Number(booking.room_id),
        recurrenceRule.frequency,
        recurrenceRule.interval,
        startDate,
        recurrenceRule.until,
        JSON.stringify(uniqueSlots),
        JSON.stringify(recurrenceRule),
        at,
      )
      .run()

    seriesId = Number(seriesRes.meta.last_row_id)
    await env.DB
      .prepare(
        `UPDATE bookings
         SET series_id = ?2,
             is_recurring = 1,
             updated_at = ?3
         WHERE id = ?1`,
      )
      .bind(bookingId, seriesId, at)
      .run()
  } else {
    await env.DB
      .prepare(
        `UPDATE booking_series
         SET frequency = ?2,
             \`interval\` = ?3,
             start_date = ?4,
             until_date = ?5,
             slots_json = ?6,
             rule_json = ?7,
             updated_at = ?8
         WHERE id = ?1`,
      )
      .bind(
        seriesId,
        recurrenceRule.frequency,
        recurrenceRule.interval,
        startDate,
        recurrenceRule.until,
        JSON.stringify(uniqueSlots),
        JSON.stringify(recurrenceRule),
        at,
      )
      .run()
  }

  const replaceableOccurrences = await env.DB
    .prepare(
      `SELECT id, occurrence_date, status, start_at, end_at
       FROM booking_occurrences
       WHERE booking_id = ?1
         AND status IN ('pending','approved','rejected')
         AND end_at >= ?2
       ORDER BY start_at ASC`,
    )
    .bind(bookingId, at)
    .all<{ id: number; occurrence_date: string; status: string; start_at: string; end_at: string }>()

  const replaceableOccurrenceIds = (replaceableOccurrences.results || []).map((row) => Number(row.id)).filter(Boolean)
  if (!replaceableOccurrenceIds.length) {
    throw createError({ statusCode: 409, statusMessage: 'Tidak ada peminjaman mendatang yang bisa di-reschedule' })
  }

  const oldSlotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, replaceableOccurrenceIds)
  const oldFutureOccurrences = (replaceableOccurrences.results || []).map((row) => ({
    id: Number(row.id),
    occurrence_date: row.occurrence_date,
    status: row.status,
    start_at: row.start_at,
    end_at: row.end_at,
    slots: oldSlotsByOccurrenceId.get(Number(row.id)) || [],
  }))

  await env.DB
    .prepare(
      `DELETE FROM booking_occurrences
       WHERE booking_id = ?1
         AND status IN ('pending','approved','rejected')
         AND end_at >= ?2`,
    )
    .bind(bookingId, at)
    .run()

  const activityName = body?.activityName !== undefined ? normalizeOptionalText(body.activityName) : booking.activity_name
  const participantCount =
    body?.participantCount !== undefined
      ? (body?.participantCount !== null ? Number(body.participantCount) : null)
      : booking.participant_count
  const notes = body?.notes !== undefined ? normalizeOptionalText(body.notes) : booking.notes

  await env.DB
    .prepare(
      `UPDATE bookings
       SET status = 'pending',
           activity_name = ?2,
           participant_count = ?3,
           notes = ?4,
           is_recurring = 1,
           updated_at = ?5
       WHERE id = ?1`,
    )
    .bind(bookingId, activityName, participantCount, notes, at)
    .run()

  const occurrenceIds: number[] = []
  const newOccurrencesForPayload: Array<{
    id: number
    occurrence_date: string
    status: string
    start_at: string
    end_at: string
    slots: Array<{ start_at: string; end_at: string }>
  }> = []

  for (const ymd of Array.from(slotStartIsosByDate.keys()).sort()) {
    const starts = [...(slotStartIsosByDate.get(ymd) || [])].sort((a, b) => a.localeCompare(b))
    const firstStart = starts[0]
    const lastEnd = toIsoNoMs(new Date(new Date(starts[starts.length - 1]!).getTime() + stepMs))

    const occurrenceRes = await env.DB
      .prepare(
        `INSERT INTO booking_occurrences
           (booking_id, occurrence_date, status, start_at, end_at, created_at, updated_at)
         VALUES (?1, ?2, 'pending', ?3, ?4, ?5, ?5)`,
      )
      .bind(bookingId, ymd, firstStart, lastEnd, at)
      .run()

    const occurrenceId = Number(occurrenceRes.meta.last_row_id)
    occurrenceIds.push(occurrenceId)

    const newSlotsForPayload: Array<{ start_at: string; end_at: string }> = []
    const slotStatements = [] as ReturnType<D1Database['prepare']>[]
    for (const slotStartIso of starts) {
      const slotStart = new Date(slotStartIso)
      const slotEnd = toIsoNoMs(new Date(slotStart.getTime() + stepMs))
      newSlotsForPayload.push({ start_at: toIsoNoMs(slotStart), end_at: slotEnd })
      slotStatements.push(
        env.DB.prepare(
          `INSERT INTO booking_occurrence_slots (occurrence_id, start_at, end_at)
           VALUES (?1, ?2, ?3)`,
        ).bind(occurrenceId, toIsoNoMs(slotStart), slotEnd),
      )
    }

    if (slotStatements.length) {
      await env.DB.batch(slotStatements)
    }

    newOccurrencesForPayload.push({
      id: occurrenceId,
      occurrence_date: ymd,
      status: 'pending',
      start_at: firstStart,
      end_at: lastEnd,
      slots: newSlotsForPayload,
    })
  }

  await env.DB
    .prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, NULL, ?2, 'rescheduled_all', ?3, ?4)`,
    )
    .bind(
      bookingId,
      Number(auth.sub),
      JSON.stringify({
        scope: 'all',
        reason: reason || null,
        replaced_occurrences: oldFutureOccurrences,
        new_occurrences: newOccurrencesForPayload,
        occurrences: occurrenceIds.length,
      }),
      at,
    )
    .run()

  const summary = await recalculateBookingSummary(env.DB, bookingId)

  return {
    ok: true,
    bookingId,
    seriesId,
    occurrenceIds,
    status: summary.status,
    summary,
  }
})
