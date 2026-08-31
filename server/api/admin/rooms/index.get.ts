import { getQuery } from 'h3'
import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'
import { parsePagination } from '../../../utils/pagination'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const q = getQuery(event)
  const { page, pageSize, offset } = parsePagination(q)
  const search = typeof q.search === 'string' ? q.search.trim() : ''

  const conditions: string[] = ['deleted_at IS NULL']
  const binds: unknown[] = []

  if (search) {
    conditions.push('(name LIKE ? OR location LIKE ?)')
    binds.push(`%${search}%`, `%${search}%`)
  }

  const whereSql = conditions.join(' AND ')

  const totalRow = await env.DB.prepare(
    `SELECT COUNT(*) as total
     FROM rooms
     WHERE ${whereSql}`,
  )
    .bind(...binds)
    .first<{ total: number }>()

  const rooms = await env.DB.prepare(
    `SELECT id, name, location, capacity, description,
            open_time_start, open_time_end, slot_minutes,
            COALESCE(available_for_booking, 1) AS available_for_booking,
            created_at, updated_at
     FROM rooms
     WHERE ${whereSql}
     ORDER BY created_at DESC
     LIMIT ${pageSize} OFFSET ${offset}`,
  )
    .bind(...binds)
    .all<{
      id: number
      name: string | null
      location: string | null
      capacity: number | null
      description: string | null
      open_time_start: string | null
      open_time_end: string | null
      slot_minutes: number | null
      available_for_booking: number | null
      created_at: string | null
      updated_at: string | null
    }>()

  const roomIds = rooms.results.map((room) => room.id)
  const photosByRoom = new Map<number, Array<{ id: number; url: string; created_at: string | null }>>()
  if (roomIds.length > 0) {
    const placeholders = roomIds.map(() => '?').join(', ')
    const photos = await env.DB.prepare(
      `SELECT id, room_id, object_key, created_at
       FROM room_photos
       WHERE deleted_at IS NULL
         AND room_id IN (${placeholders})
       ORDER BY created_at DESC`,
    )
      .bind(...roomIds)
      .all<{
        id: number
        room_id: number
        object_key: string
        created_at: string | null
      }>()

    for (const photo of photos.results) {
      const list = photosByRoom.get(photo.room_id) || []
      list.push({
        id: photo.id,
        url: `/api/rooms/photos/${photo.id}`,
        created_at: photo.created_at,
      })
      photosByRoom.set(photo.room_id, list)
    }
  }

  const enrichedRooms = rooms.results.map((room) => ({
    ...room,
    photos: photosByRoom.get(room.id) || [],
  }))

  const total = totalRow?.total || 0
  return {
    ok: true,
    data: enrichedRooms,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
})
