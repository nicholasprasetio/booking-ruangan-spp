import type { ExternalBookingRequest } from '~/models/external-booking'
import type { PaginatedResponse } from '~/models/pagination'

export function fetchAdminExternalBookingRequests(
  params: { page: number; pageSize: number; search?: string; status?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<ExternalBookingRequest>>('/api/admin/external-booking-requests', {
    headers,
    query: params,
  })
}

export function acceptExternalBookingRequest(
  id: number,
  payload: { roomId: number; date: string; startTime: string; endTime: string },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; requestId: number; bookingId: number; status: string }>(`/api/admin/external-booking-requests/${id}/accept`, {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function rejectExternalBookingRequest(id: number, payload: { reason: string }, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; requestId: number; status: string }>(`/api/admin/external-booking-requests/${id}/reject`, {
    method: 'POST',
    headers,
    body: payload,
  })
}
