export function fetchSecurityKeys(headers: Record<string, string>, hoursAhead = 8) {
  return $fetch<{ ok: boolean; now: string; until: string; data: any[] }>('/api/security/keys', {
    headers,
    query: { hoursAhead },
  })
}

export function scanSecurityKey(token: string, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; action: 'picked_up' | 'returned'; scanned_at: string; room_name: string | null; activity_name: string | null }>('/api/security/scan', {
    method: 'POST',
    headers,
    body: { token },
  })
}
