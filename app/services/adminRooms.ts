import type { PaginatedResponse } from '~/models/pagination'
import type { CombinedRoomPayload, Room, RoomPhoto, RoomUpsertPayload } from '~/models/room'

export function fetchAdminRooms(
  params: { page: number; pageSize: number; search?: string },
  headers: Record<string, string>,
) {
  return $fetch<PaginatedResponse<Room>>('/api/admin/rooms', {
    headers,
    query: params,
  })
}

export function createAdminRoom(payload: RoomUpsertPayload, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; room: Room }>('/api/admin/rooms', {
    method: 'POST',
    headers,
    body: payload,
  })
}

export function updateAdminRoom(id: number, payload: RoomUpsertPayload, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; room: Room }>(`/api/admin/rooms/${id}`, {
    method: 'PUT',
    headers,
    body: payload,
  })
}

export function createCombinedAdminRoom(payload: CombinedRoomPayload, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; room: Room }>('/api/admin/rooms/combined', { method: 'POST', headers, body: payload })
}

export function updateCombinedAdminRoom(id: number, payload: CombinedRoomPayload, headers: Record<string, string>) {
  return $fetch<{ ok: boolean; room: Room }>(`/api/admin/rooms/${id}/combined`, { method: 'PUT', headers, body: payload })
}

export function deleteAdminRoom(id: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/rooms/${id}`, {
    method: 'DELETE',
    headers,
  })
}

export function uploadAdminRoomPhotos(roomId: number, files: File[], headers: Record<string, string>) {
  const formData = new FormData()
  for (const file of files) {
    formData.append('files', file)
  }

  return $fetch<{ ok: boolean; photos: RoomPhoto[] }>(`/api/admin/rooms/${roomId}/photos`, {
    method: 'POST',
    headers,
    body: formData,
  })
}

export function deleteAdminRoomPhoto(photoId: number, headers: Record<string, string>) {
  return $fetch<{ ok: boolean }>(`/api/admin/rooms/photos/${photoId}`, {
    method: 'DELETE',
    headers,
  })
}

export function registerAdminRoomPhoto(
  roomId: number,
  payload: { objectKey: string; contentType: string; byteSize: number },
  headers: Record<string, string>,
) {
  return $fetch<{ ok: boolean; photo: { id: number; url: string; created_at: string } }>(
    `/api/admin/rooms/${roomId}/photos/register`,
    {
      method: 'POST',
      headers,
      body: payload,
    },
  )
}

export function bulkDeleteAdminRooms(ids: number[], headers: Record<string, string>) {
  return $fetch<{
    ok: boolean
    deleted: number[]
    failed: Array<{ id: number; reason: string }>
  }>('/api/admin/rooms/bulk-delete', {
    method: 'POST',
    headers,
    body: { ids },
  })
}

export function bulkUpsertAdminRooms(
  rooms: Array<{
    name: string
    location?: string | null
    capacity?: number | null
    description?: string | null
    open_time_start?: string | null
    open_time_end?: string | null
    slot_minutes?: number | null
    available_for_booking?: boolean | null
  }>,
  headers: Record<string, string>,
) {
  return $fetch<{
    ok: boolean
    created: number
    updated: number
    failed: Array<{ index: number; reason: string }>
  }>('/api/admin/rooms/bulk-upsert', {
    method: 'POST',
    headers,
    body: { rooms },
  })
}

