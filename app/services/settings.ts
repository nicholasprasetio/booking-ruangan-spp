import type { GeneralSettings } from './adminSettings'

export function fetchGeneralBookingSettings(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; settings: GeneralSettings }>('/api/settings/general', {
    headers,
  })
}
