export interface ExternalBookingRequest {
  id: number
  requester_name: string
  requester_phone: string
  origin_environment: string | null
  purpose: string
  participant_count: number
  notes: string | null
  room_id: number
  room_name: string | null
  room_location?: string | null
  room_capacity?: number | null
  request_date: string
  start_time: string
  end_time: string
  slots_json: string
  request_letter_object_key: string | null
  request_letter_file_name: string | null
  request_letter_content_type: string | null
  request_letter_file_size: number | null
  status: 'pending' | 'accepted' | 'rejected'
  rejection_reason: string | null
  accepted_booking_id: number | null
  reviewed_by: number | null
  reviewer_name?: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ExternalBookingLetterTemplate {
  object_key: string | null
  file_name: string | null
  content_type: string | null
  file_size: number | null
  updated_at: string | null
  available: boolean
}
