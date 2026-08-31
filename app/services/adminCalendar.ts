import type { CalendarEvent } from '~/models/booking'

export function fetchCalendarEvents(
  params: { start: string; end: string; room_id?: number },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; data: CalendarEvent[] }>('/api/admin/calendar', {
    headers,
    query: params,
  })
}
