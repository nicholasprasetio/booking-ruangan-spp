import { createError } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'

export type BookingRow = {
  id: number
  user_id: number
  room_id: number
  status: string
  is_recurring: number
  series_id: number | null
  activity_name: string | null
  participant_count: number | null
  notes: string | null
}

export type OccurrenceSlot = { start_at: string; end_at: string }

export function nowIso(): string {

  const now = new Date()

  const parts = new Intl.DateTimeFormat('en-CA', {

    timeZone: 'Asia/Jakarta',

    year: 'numeric',

    month: '2-digit',

    day: '2-digit',

    hour: '2-digit',

    minute: '2-digit',

    second: '2-digit',

    hourCycle: 'h23',

  }).formatToParts(now)



  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''



  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`

}


export async function requireBookingAccess(
  db: D1Database,
  bookingId: number,
  actorUserId: number,
  isAdmin: boolean,
): Promise<BookingRow> {
  const booking = await db.prepare(
    `SELECT id, user_id, room_id, status, is_recurring, series_id, activity_name, participant_count, notes
     FROM bookings
     WHERE id = ?1 AND deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(bookingId)
    .first<BookingRow>()

  if (!booking) {
    throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  }

  if (!isAdmin && Number(booking.user_id) !== Number(actorUserId)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  return booking
}

type OccurrenceSummary = {
  total: number
  pending: number
  approved: number
  rejected: number
  completed: number
  canceled: number
  start_at: string | null
  end_at: string | null
}

export async function recalculateBookingSummary(db: D1Database, bookingId: number): Promise<OccurrenceSummary & { status: string }> {
  const summary =
    (await db
      .prepare(
        `SELECT
            COUNT(*) as total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'canceled' THEN 1 ELSE 0 END) as canceled,
            MIN(start_at) as start_at,
            MAX(end_at) as end_at
         FROM booking_occurrences
         WHERE booking_id = ?1`,
      )
      .bind(bookingId)
      .first<OccurrenceSummary>()) || {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      completed: 0,
      canceled: 0,
      start_at: null,
      end_at: null,
    }

  const total = Number(summary.total || 0)
  const pending = Number(summary.pending || 0)
  const approved = Number(summary.approved || 0)
  const rejected = Number(summary.rejected || 0)
  const completed = Number(summary.completed || 0)
  const canceled = Number(summary.canceled || 0)

  let status = 'pending'
  if (total === 0) {
    status = 'canceled'
  } else if (pending > 0) {
    status = 'pending'
  } else if (approved > 0) {
    status = 'approved'
  } else if (completed > 0) {
    status = 'completed'
  } else if (rejected === total) {
    status = 'rejected'
  } else if (canceled === total) {
    status = 'canceled'
  } else {
    status = 'completed'
  }

  const latestReject = await db
    .prepare(
      `SELECT rejection_reason
       FROM booking_occurrences
       WHERE booking_id = ?1
         AND rejection_reason IS NOT NULL
         AND TRIM(rejection_reason) != ''
       ORDER BY updated_at DESC
       LIMIT 1`,
    )
    .bind(bookingId)
    .first<{ rejection_reason: string | null }>()

  const at = nowIso()
  await db
    .prepare(
      `UPDATE bookings
       SET status = ?2,
           start_date = ?3,
           end_date = ?4,
           rejection_reason = ?5,
           updated_at = ?6
       WHERE id = ?1`,
    )
    .bind(bookingId, status, summary.start_at || null, summary.end_at || null, latestReject?.rejection_reason || null, at)
    .run()

  return {
    total,
    pending,
    approved,
    rejected,
    completed,
    canceled,
    start_at: summary.start_at,
    end_at: summary.end_at,
    status,
  }
}

export async function resolveOccurrenceForAction(
  db: D1Database,
  params: {
    bookingId: number
    occurrenceId?: number | null
    allowedStatuses: string[]
  },
): Promise<{ id: number; status: string; start_at: string; end_at: string }> {
  const { bookingId, occurrenceId, allowedStatuses } = params
  if (!allowedStatuses.length) {
    throw createError({ statusCode: 400, statusMessage: 'allowedStatuses is required' })
  }

  const placeholders = allowedStatuses.map((_, idx) => `?${idx + 2}`).join(', ')

  if (occurrenceId) {
    const row = await db
      .prepare(
        `SELECT id, status, start_at, end_at
         FROM booking_occurrences
         WHERE booking_id = ?1
           AND id = ?${allowedStatuses.length + 2}
           AND status IN (${placeholders})
         LIMIT 1`,
      )
      .bind(bookingId, ...allowedStatuses, occurrenceId)
      .first<{ id: number; status: string; start_at: string; end_at: string }>()

    if (!row) {
      throw createError({ statusCode: 404, statusMessage: 'Target occurrence not found for this booking' })
    }
    return row
  }

  const now = nowIso()
  const row = await db
    .prepare(
      `SELECT id, status, start_at, end_at
       FROM booking_occurrences
       WHERE booking_id = ?1
         AND status IN (${placeholders})
       ORDER BY CASE WHEN start_at >= ?${allowedStatuses.length + 2} THEN 0 ELSE 1 END,
                start_at ASC
       LIMIT 1`,
    )
    .bind(bookingId, ...allowedStatuses, now)
    .first<{ id: number; status: string; start_at: string; end_at: string }>()

  if (!row) {
    throw createError({ statusCode: 409, statusMessage: 'No actionable occurrence found' })
  }

  return row
}

export async function getOccurrenceSlotsMap(db: D1Database, occurrenceIds: number[]): Promise<Map<number, OccurrenceSlot[]>> {
  const out = new Map<number, OccurrenceSlot[]>()
  if (!occurrenceIds.length) return out

  for (let i = 0; i < occurrenceIds.length; i += 100) {
    const chunk = occurrenceIds.slice(i, i + 100)
    const placeholders = chunk.map((_, idx) => `?${idx + 1}`).join(', ')
    const rows = await db
      .prepare(
        `SELECT occurrence_id, start_at, end_at
         FROM booking_occurrence_slots
         WHERE occurrence_id IN (${placeholders})
         ORDER BY start_at ASC`,
      )
      .bind(...chunk)
      .all<{ occurrence_id: number; start_at: string; end_at: string }>()

    for (const row of rows.results || []) {
      const list = out.get(Number(row.occurrence_id)) || []
      list.push({ start_at: row.start_at, end_at: row.end_at })
      out.set(Number(row.occurrence_id), list)
    }
  }

  return out
}

export async function ensureBookingKeyToken(
  db: D1Database,
  params: { bookingId: number; occurrenceId: number; at?: string },
): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT token
       FROM booking_key_tokens
       WHERE occurrence_id = ?1
       LIMIT 1`,
    )
    .bind(params.occurrenceId)
    .first<{ token: string }>()

  if (existing?.token) return existing.token

  const at = params.at || nowIso()
  const token = `KEY-${params.occurrenceId}-${crypto.randomUUID().replace(/-/g, '')}`
  await db
    .prepare(
      `INSERT INTO booking_key_tokens (booking_id, occurrence_id, token, created_at, updated_at)
       VALUES (?1, ?2, ?3, ?4, ?4)`,
    )
    .bind(params.bookingId, params.occurrenceId, token, at)
    .run()

  return token
}

export async function ensureBookingKeyTokensForBooking(db: D1Database, bookingId: number): Promise<void> {
  const rows = await db
    .prepare(
      `SELECT id
       FROM booking_occurrences
       WHERE booking_id = ?1
         AND status = 'approved'`,
    )
    .bind(bookingId)
    .all<{ id: number }>()

  for (const row of rows.results || []) {
    await ensureBookingKeyToken(db, { bookingId, occurrenceId: Number(row.id) })
  }
}
