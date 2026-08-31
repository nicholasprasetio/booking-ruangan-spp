import type { Booking } from '~/models/booking'
import type { PaginatedResponse } from '~/models/pagination'

export function fetchAdminPendingBookings(
  params: { page: number; pageSize: number; search?: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<Booking>>('/api/admin/bookings/pending', {
    headers,
    query: params,
  })
}

export function fetchAdminAllBookings(
  params: { page: number; pageSize: number; search?: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<Booking>>('/api/admin/bookings', {
    headers,
    query: params,
  })
}

export function approveAdminBooking(id: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/bookings/${id}/approve`, {
    method: 'POST',
    headers,
  })
}

export function approveAdminBookingWithScope(
  id: number,
  payload: { occurrenceId?: number; scope?: 'occurrence' | 'all' },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>(`/api/admin/bookings/${id}/approve`, {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function rejectAdminBooking(id: number, payload: { reason: string }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/bookings/${id}/reject`, {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function rejectAdminBookingWithScope(
  id: number,
  payload: { reason: string; occurrenceId?: number; scope?: 'occurrence' | 'all' },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean }>(`/api/admin/bookings/${id}/reject`, {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function changeAdminBookingRoom(id: number, payload: { roomId: number }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; bookingId: number; roomId: number }>(`/api/admin/bookings/${id}/room`, {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function bulkAdminBookingAction(
  payload: {
    action: 'approve' | 'reject' | 'cancel'
    items: Array<{ bookingId: number; occurrenceId?: number | null; scope?: 'occurrence' | 'all' }>
    reason?: string
  },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; processed: number; failed: number; results: any[] }>('/api/admin/bookings/bulk-action', {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function changeAdminBookingOccurrenceRoom(
  bookingId: number,
  occurrenceId: number,
  payload: { roomId: number },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; bookingId: number; occurrenceId: number; roomId: number }>(`/api/admin/bookings/${bookingId}/occurrences/${occurrenceId}/room`, {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function fetchBookingReport(
  params: {
    start_date: string
    end_date: string
    status?: string
    room_id?: number
    search?: string
  },
  headers: Record<string, string>,
) {
  return $fetch<{
    ok: boolean
    data: Booking[]
    summary: {
      total: number
      pending: number
      approved: number
      rejected: number
      completed: number
      canceled: number
    }
  }>('/api/admin/bookings/report', {
    headers,
    query: params,
  })
}

