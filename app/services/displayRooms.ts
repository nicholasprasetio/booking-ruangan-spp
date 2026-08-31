export function fetchDisplayRooms(headers: Record<string, string>, hoursAhead = 6) {
  return $fetch<{ ok: boolean; now: string; until: string; hoursAhead: number; data: any[] }>('/api/display/rooms', {
    headers,
    query: { hoursAhead },
  })
}
