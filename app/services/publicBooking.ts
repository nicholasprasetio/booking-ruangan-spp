import type { RoomSchedule } from '~/models/booking'
import type { ExternalBookingLetterTemplate } from '~/models/external-booking'
import type { PaginatedResponse } from '~/models/pagination'

export function fetchPublicRoomAvailability(params: {
  date: string
  startTime?: string
  endTime?: string
  roomId?: number
  page: number
  pageSize: number
  search?: string
  includeUnavailable?: boolean
}) {
  return $fetch<PaginatedResponse<RoomSchedule> & { date: string; startTime: string | null; endTime: string | null }>('/api/public/rooms/availability', {
    query: params,
  })
}

export function fetchPublicBookingLetterTemplate() {
  return $fetch<{ ok: boolean; template: ExternalBookingLetterTemplate }>('/api/public/settings/booking-letter-template')
}

export function submitExternalBookingRequest(formData: FormData) {
  return $fetch<{ ok: boolean; requestId: number; status: string }>('/api/public/external-booking-requests', {
    method: 'POST',
    body: formData,
  })
}
