import { createError } from 'h3'
import { getCloudflareEnv } from '../../utils/cf-env'
import { requireAuth } from '../../utils/auth'
import { hasRole } from '../../utils/roles'
import { getOccurrenceSlotsMap } from '../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const env = getCloudflareEnv(event)

  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid booking id' })

  const booking = await env.DB
    .prepare(
      `SELECT
          b.id,
          b.status,
          b.created_at,
          b.updated_at,
          b.user_id,
          b.room_id,
          b.activity_name,
          b.participant_count,
          b.notes,
          b.request_letter_object_key,
          b.request_letter_file_name,
          b.request_letter_content_type,
          b.request_letter_file_size,
          b.external_request_id,
          b.external_requester_name,
          b.external_requester_phone,
          b.external_origin_environment,
          b.rejection_reason,
          b.is_recurring,
          b.series_id,
          b.start_date,
          b.end_date,
          s.frequency as series_frequency,
          s.interval as series_interval,
          s.start_date as series_start_date,
          s.until_date as series_until_date,
          s.rule_json as series_rule_json,
          COALESCE(b.external_requester_name, u.fullname) AS user_name,
          u.email AS user_email,
          COALESCE(b.external_requester_phone, u.phone_number) AS user_phone,
          r.name AS room_name,
          r.open_time_start,
          r.open_time_end,
          r.slot_minutes
       FROM bookings b
       JOIN users u ON u.id = b.user_id
       JOIN rooms r ON r.id = b.room_id
       LEFT JOIN booking_series s ON s.id = b.series_id
       WHERE b.id = ?1 AND b.deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(id)
    .first<{
      id: number
      status: string | null
      created_at: string
      updated_at: string
      user_id: number
      room_id: number
      activity_name: string | null
      participant_count: number | null
      notes: string | null
      request_letter_object_key: string | null
      request_letter_file_name: string | null
      request_letter_content_type: string | null
      request_letter_file_size: number | null
      external_request_id: number | null
      external_requester_name: string | null
      external_requester_phone: string | null
      external_origin_environment: string | null
      rejection_reason: string | null
      is_recurring: number
      series_id: number | null
      start_date: string | null
      end_date: string | null
      series_frequency: string | null
      series_interval: number | null
      series_start_date: string | null
      series_until_date: string | null
      series_rule_json: string | null
      user_name: string | null
      user_email: string | null
      user_phone: string | null
      room_name: string | null
      open_time_start: string | null
      open_time_end: string | null
      slot_minutes: number | null
    }>()

  if (!booking) throw createError({ statusCode: 404, statusMessage: 'Booking not found' })
  if (Number(booking.user_id) !== Number(auth.sub) && !hasRole(auth, 'admin')) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' })
  }

  const occurrencesRes = await env.DB
    .prepare(
      `SELECT
          id,
          occurrence_date,
          status,
          start_at,
          end_at,
          rejection_reason,
          cancel_reason,
          created_at,
          updated_at
       FROM booking_occurrences
       WHERE booking_id = ?1
       ORDER BY start_at ASC`,
    )
    .bind(id)
    .all<{
      id: number
      occurrence_date: string
      status: string
      start_at: string
      end_at: string
      rejection_reason: string | null
      cancel_reason: string | null
      created_at: string
      updated_at: string
    }>()

  const occurrenceIds = (occurrencesRes.results || []).map((row) => Number(row.id)).filter(Boolean)
  const slotsByOccurrenceId = await getOccurrenceSlotsMap(env.DB, occurrenceIds)

  const events = await env.DB
    .prepare(
      `SELECT
          be.id,
          be.occurrence_id,
          be.type,
          be.actor_user_id,
          u.fullname as actor_name,
          u.email as actor_email,
          be.payload,
          be.created_at
       FROM booking_events be
       LEFT JOIN users u ON u.id = be.actor_user_id
       WHERE be.booking_id = ?1
       ORDER BY be.created_at DESC
       LIMIT 200`,
    )
    .bind(id)
    .all<{
      id: number
      occurrence_id: number | null
      type: string
      actor_user_id: number | null
      actor_name: string | null
      actor_email: string | null
      payload: string | null
      created_at: string
    }>()

  const occurrences = (occurrencesRes.results || []).map((row) => ({
    ...row,
    slots: slotsByOccurrenceId.get(Number(row.id)) || [],
  }))

  const occurrence_total = occurrences.length
  const occurrence_pending = occurrences.filter((o) => o.status === 'pending').length
  const occurrence_approved = occurrences.filter((o) => o.status === 'approved').length
  const occurrence_rejected = occurrences.filter((o) => o.status === 'rejected').length
  const occurrence_completed = occurrences.filter((o) => o.status === 'completed').length
  const occurrence_canceled = occurrences.filter((o) => o.status === 'canceled').length

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').replace(/\.\d{3}Z$/, 'Z')
  const nextOccurrence = occurrences
    .filter((o) => o.status === 'pending' || o.status === 'approved')
    .sort((a, b) => {
      const aFuture = a.start_at >= now ? 0 : 1
      const bFuture = b.start_at >= now ? 0 : 1
      if (aFuture !== bFuture) return aFuture - bFuture
      return a.start_at.localeCompare(b.start_at)
    })[0] || null

  return {
    ok: true,
    booking: {
      ...booking,
      is_recurring: Number(booking.is_recurring || 0) === 1,
      occurrence_total,
      occurrence_pending,
      occurrence_approved,
      occurrence_rejected,
      occurrence_completed,
      occurrence_canceled,
      next_occurrence: nextOccurrence,
      occurrences,
      events: events.results || [],
    },
  }
})
