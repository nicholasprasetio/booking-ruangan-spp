import type { RoomSchedule } from '~/models/booking'
import type { PaginatedResponse } from '~/models/pagination'

export function fetchRoomsSchedule(
  params: { date: string; page: number; pageSize: number; search?: string; includeUnavailable?: boolean },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<RoomSchedule>>('/api/rooms/schedule', {
    method: 'GET',
    headers,
    query: params,
  })
}

export function fetchRoomScheduleById(
  roomId: number,
  params: { date: string; excludeBookingId?: number | null; excludeSeriesId?: number | null; excludeOccurrenceId?: number | null },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; room: any }>(`/api/rooms/${roomId}/schedule`, {
    headers,
    query: params,
  })
}
