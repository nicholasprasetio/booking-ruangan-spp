import type { Booking, CalendarEvent } from '~/models/booking'
import type { PaginatedResponse } from '~/models/pagination'

export function fetchBookingById(id: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; booking: Booking }>(`/api/bookings/${id}`, { headers })
}

export function createBooking(
  payload: {
    roomId: number
    date: string
    slots: string[]
    recurrence?:
      | {
          frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
          until: string
          interval?: number
          weeklyDays?: number[]
          monthlyDay?: number
          yearlyMonth?: number
          yearlyDay?: number
        }
      | null
    activityName: string | null
    participantCount: number | null
    notes: string | null
    requestLetter?: {
      objectKey: string
      fileName: string
      contentType: string
      byteSize: number
    } | null
  },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; bookingId: number; seriesId?: number; occurrenceIds: number[]; status: string }>('/api/bookings', {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function cancelBooking(
  bookingId: number,
  payload: { reason?: string; occurrenceId?: number; scope?: 'occurrence' | 'all' } | null,
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>('/api/bookings/cancel', {
    method: 'POST',
    headers,
    body: { bookingId, ...(payload || {}) },
  })
}

export function rescheduleBooking(
  bookingId: number,
  payload: {
    occurrenceId?: number
    date: string
    slots: string[]
    activityName: string | null
    participantCount: number | null
    notes: string | null
  },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>('/api/bookings/reschedule', {
    method: 'POST',
    headers,
    body: { bookingId, ...payload },
  })
}

export function cancelBookingSeries(
  bookingId: number,
  payload: { reason?: string } | null,
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>('/api/bookings/cancel', {
    method: 'POST',
    headers,
    body: { bookingId, scope: 'all', ...(payload || {}) },
  })
}

export function rescheduleBookingSeries(
  bookingId: number,
  payload: {
    startDate: string
    recurrence: {
      frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
      until: string
      interval?: number
      weeklyDays?: number[]
      monthlyDay?: number
      yearlyMonth?: number
      yearlyDay?: number
    }
    slots: string[]
    activityName: string | null
    participantCount: number | null
    notes: string | null
    reason?: string
  },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; bookingId: number; seriesId?: number; occurrenceIds: number[] }>('/api/bookings/reschedule-series', {
    method: 'POST',
    headers,
    body: { bookingId, ...payload },
  })
}

export function fetchUserBookings(
  params: { page: number; pageSize: number; search?: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<Booking>>('/api/bookings', {
    headers,
    query: params,
  })
}

export function fetchUserBookingHistory(
  params: { page: number; pageSize: number; search?: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<Booking>>('/api/history', {
    headers,
    query: params,
  })
}

export function fetchUserCalendarEvents(
  params: { start: string; end: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; data: CalendarEvent[] }>('/api/bookings/calendar', {
    headers,
    query: params,
  })
}
