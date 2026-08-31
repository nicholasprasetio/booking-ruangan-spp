import type { ExternalBookingLetterTemplate } from '~/models/external-booking'

export type GeneralSettings = {
  booking_min_lead_days: number
  external_booking_letter_template?: ExternalBookingLetterTemplate
}

export function fetchGeneralSettings(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; settings: GeneralSettings }>('/api/admin/settings/general', {
    headers,
  })
}

export function updateGeneralSettings(payload: GeneralSettings, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; settings: GeneralSettings }>('/api/admin/settings/general', {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function uploadAdminBookingLetterTemplate(formData: FormData, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; template: ExternalBookingLetterTemplate }>('/api/admin/settings/booking-letter-template', {
    method: 'PUT',
    headers,
    body: formData,
  })
}

export function deleteAdminBookingLetterTemplate(headers: Record<string, string>) {
  return $fetch<{ ok: boolean; template: ExternalBookingLetterTemplate }>('/api/admin/settings/booking-letter-template', {
    method: 'DELETE',
    headers,
  })
}
