import { createError, readBody } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'
import { buildSlotStartIsosForDate, toIsoNoMs, toMinutes, toUniqueSlotLabels } from '../../utils/booking-slots'
import {
  nowIso,
  recalculateBookingSummary,
  requireBookingAccess,
  resolveOccurrenceForAction,
} from '../../utils/booking-v2'
import { ensureBookingLeadTime } from '../../utils/settings'

type RescheduleBookingBody = {
  bookingId?: number
  occurrenceId?: number
  date?: string
  slots?: string[]
  activityName?: string
  participantCount?: number | null
  notes?: string
}

function normalizeOptionalText(input: unknown): string | null {
  if (typeof input !== 'string') return null
  const trimmed = input.trim()
  return trimmed.length ? trimmed : null
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const body = (await readBody(event)) as RescheduleBookingBody
  const bookingId = Number(body?.bookingId)
  const occurrenceId = body?.occurrenceId !== undefined && body?.occurrenceId !== null
    ? Number(body.occurrenceId)
    : null
  const date = typeof body?.date === 'string' ? body.date : ''
  const uniqueSlots = toUniqueSlotLabels(Array.isArray(body?.slots) ? body.slots : [])

  if (!bookingId) throw createError({ statusCode: 400, statusMessage: 'Invalid bookingId' })
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid date (expected YYYY-MM-DD)' })
  }
  if (!uniqueSlots.length) {
    throw createError({ statusCode: 400, statusMessage: 'slots is required' })
  }

  const booking = await requireBookingAccess(env.DB, bookingId, Number(auth.sub), hasRole(auth, 'admin'))
  const target = await resolveOccurrenceForAction(env.DB, {
    bookingId,
    occurrenceId,
    allowedStatuses: ['pending', 'approved', 'rejected'],
  })
  const at = nowIso()

  if (target.end_at < at) {
    throw createError({ statusCode: 409, statusMessage: 'Peminjaman yang sudah lewat tidak bisa di-reschedule' })
  }

  await ensureBookingLeadTime(env.DB, auth, [date])

  const room = await env.DB
    .prepare(
      `SELECT open_time_start, open_time_end, slot_minutes
       FROM rooms
       WHERE id = ?1 AND deleted_at IS NULL AND COALESCE(available_for_booking, 1) = 1`,
    )
    .bind(Number(booking.room_id))
    .first<{ open_time_start: string | null; open_time_end: string | null; slot_minutes: number | null }>()

  if (!room) {
    throw createError({ statusCode: 404, statusMessage: 'Room not found or not available for booking' })
  }

  const slotMinutes = room.slot_minutes || 60
  const openStartMin = toMinutes(room.open_time_start || '00:00')
  const openEndMin = toMinutes(room.open_time_end || '24:00')

  const slotStartIsos = buildSlotStartIsosForDate({
    ymd: date,
    slots: uniqueSlots,
    openStartMin,
    openEndMin,
    slotMinutes,
  })

  for (let i = 0; i < slotStartIsos.length; i += 98) {
    const chunk = slotStartIsos.slice(i, i + 98)
    const placeholders = chunk.map((_, idx) => `?${idx + 3}`).join(', ')
    const overlap = await env.DB
      .prepare(
        `SELECT bos.start_at
         FROM booking_occurrence_slots bos
         JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
         JOIN bookings b ON b.id = bo.booking_id
         WHERE b.room_id = ?1
           AND b.deleted_at IS NULL
           AND bo.id != ?2
           AND bo.status IN ('pending','approved')
           AND bos.start_at IN (${placeholders})
         LIMIT 1`,
      )
      .bind(Number(booking.room_id), target.id, ...chunk)
      .first<{ start_at: string }>()

    if (overlap) {
      throw createError({ statusCode: 409, statusMessage: 'Room is not available in the selected slots' })
    }
  }

  if (body?.participantCount !== undefined && body?.participantCount !== null) {
    const count = Number(body.participantCount)
    if (!Number.isFinite(count) || count < 1) {
      throw createError({ statusCode: 400, statusMessage: 'participantCount must be at least 1' })
    }
  }

  const oldSlots = await env.DB
    .prepare(
      `SELECT start_at, end_at
       FROM booking_occurrence_slots
       WHERE occurrence_id = ?1
       ORDER BY start_at ASC`,
    )
    .bind(target.id)
    .all<{ start_at: string; end_at: string }>()

  const stepMs = slotMinutes * 60 * 1000
  const sortedStarts = [...slotStartIsos].sort((a, b) => a.localeCompare(b))
  const nextStart = sortedStarts[0]
  const nextEnd = toIsoNoMs(new Date(new Date(sortedStarts[sortedStarts.length - 1]!).getTime() + stepMs))
  if (nextEnd < at) {
    throw createError({ statusCode: 409, statusMessage: 'Jadwal baru sudah lewat' })
  }

  const statements = [] as ReturnType<D1Database['prepare']>[]
  statements.push(
    env.DB.prepare(
      `UPDATE booking_occurrences
       SET occurrence_date = ?2,
           status = 'pending',
           start_at = ?3,
           end_at = ?4,
           rejection_reason = NULL,
           cancel_reason = NULL,
           updated_at = ?5
       WHERE id = ?1`,
    ).bind(target.id, date, nextStart, nextEnd, at),
  )
  statements.push(
    env.DB.prepare(`DELETE FROM booking_occurrence_slots WHERE occurrence_id = ?1`).bind(target.id),
  )

  for (const slotStartIso of sortedStarts) {
    const slotStart = new Date(slotStartIso)
    const slotEnd = toIsoNoMs(new Date(slotStart.getTime() + stepMs))
    statements.push(
      env.DB.prepare(
        `INSERT INTO booking_occurrence_slots (occurrence_id, start_at, end_at)
         VALUES (?1, ?2, ?3)`,
      ).bind(target.id, toIsoNoMs(slotStart), slotEnd),
    )
  }

  if (body?.activityName !== undefined || body?.participantCount !== undefined || body?.notes !== undefined) {
    const participantCount =
      body?.participantCount !== undefined
        ? (body?.participantCount !== null ? Number(body.participantCount) : null)
        : booking.participant_count

    statements.push(
      env.DB.prepare(
        `UPDATE bookings
         SET activity_name = ?2,
             participant_count = ?3,
             notes = ?4,
             updated_at = ?5
         WHERE id = ?1`,
      ).bind(
        bookingId,
        body?.activityName !== undefined ? normalizeOptionalText(body.activityName) : booking.activity_name,
        participantCount,
        body?.notes !== undefined ? normalizeOptionalText(body.notes) : booking.notes,
        at,
      ),
    )
  }

  statements.push(
    env.DB.prepare(
      `INSERT INTO booking_events (booking_id, occurrence_id, actor_user_id, type, payload, created_at)
       VALUES (?1, ?2, ?3, 'rescheduled', ?4, ?5)`,
    ).bind(
      bookingId,
      target.id,
      Number(auth.sub),
      JSON.stringify({
        from: oldSlots.results || [],
        to: sortedStarts.map((start_at) => ({
          start_at,
          end_at: toIsoNoMs(new Date(new Date(start_at).getTime() + stepMs)),
        })),
      }),
      at,
    ),
  )

  await env.DB.batch(statements)

  const summary = await recalculateBookingSummary(env.DB, bookingId)

  return {
    ok: true,
    bookingId,
    occurrenceId: target.id,
    status: summary.status,
    summary,
  }
})
