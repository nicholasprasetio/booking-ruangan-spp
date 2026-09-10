export interface RoomPhoto {
  id: number
  url: string
  thumbnailUrl?: string
  created_at: string | null
}

export interface Room {
  id: number
  name: string | null
  location: string | null
  capacity: number | null
  description: string | null
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking: number | boolean | null
  created_at: string | null
  updated_at: string | null
  photos: RoomPhoto[]
}

export interface RoomUpsertPayload {
  name: string
  location: string | null
  capacity: number | null
  description: string | null
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking: boolean
}
