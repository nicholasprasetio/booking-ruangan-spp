export interface Booking {
  id: number
  status: string
  booking_id?: number
  occurrence_id?: number
  start_date?: string | null
  end_date?: string | null
  created_at: string
  room_id: number
  room_name: string | null
  is_recurring?: boolean
  series_id?: number | null
  series_frequency?: string | null
  series_interval?: number | null
  series_start_date?: string | null
  series_until_date?: string | null
  series_rule_json?: string | null
  first_occurrence_start?: string | null
  last_occurrence_end?: string | null
  occurrence_total?: number
  occurrence_pending?: number
  occurrence_approved?: number
  occurrence_rejected?: number
  occurrence_completed?: number
  occurrence_canceled?: number
  next_occurrence?: BookingOccurrence | null
  next_pending_occurrence?: BookingOccurrence | null
  preview_occurrence?: BookingOccurrence | null
  occurrences?: BookingOccurrence[]
  slots?: Array<{ start_at: string; end_at: string }>
  events?: Array<{
    id: number
    occurrence_id?: number | null
    type: string
    actor_user_id: number | null
    actor_name?: string | null
    actor_email?: string | null
    payload: string | null
    created_at: string
  }>
  activity_name?: string | null
  participant_count?: number | null
  notes?: string | null
  request_letter_object_key?: string | null
  request_letter_file_name?: string | null
  request_letter_content_type?: string | null
  request_letter_file_size?: number | null
  rejection_reason?: string | null
  cancel_reason?: string | null
  user_name?: string | null
  user_email?: string | null
  user_phone?: string | null
  external_request_id?: number | null
  external_requester_name?: string | null
  external_requester_phone?: string | null
  external_origin_environment?: string | null
  fullname?: string | null
}

export interface BookingOccurrence {
  id: number
  bookingId?: number
  status: string
  occurrence_date?: string
  start_at: string
  end_at: string
  rejection_reason?: string | null
  cancel_reason?: string | null
  slots?: Array<{ start_at: string; end_at: string }>
}

export interface RoomSchedule {
  id: number
  name: string | null
  location: string | null
  capacity: number | null
  description: string | null
  status: 'occupied' | 'booked' | 'available' | 'unavailable'
  availability_status?: 'full' | 'partial' | 'unavailable'
  available_ranges?: Array<{ startTime: string; endTime: string }>
  requested_range_available?: boolean | null
  selected_slots?: string[]
  selected_slot_isos?: string[]
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking?: number | boolean | null
  photos: Array<{ id: number; url: string; created_at: string | null }>
  bookings: Array<{
    id: number
    status: string | null
    start: string
    end: string
    userId: number | null
    isActive: boolean
  }>
  active: any | null
}

export interface CalendarEvent {
  id: number
  booking_id: number
  title: string
  start: string
  end: string
  room_id: number
  room_name: string | null
  status: string
  booking_status?: string
  user_name: string | null
  activity_name: string | null
  participant_count: number | null
  is_recurring?: boolean
  series_id?: number | null
}
