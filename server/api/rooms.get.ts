import { getCloudflareEnv } from '../utils/cf-env'
import { requireAuth } from '../utils/auth'

export default defineEventHandler(async (event) => {
  // example protected endpoint
  const auth = await requireAuth(event)
  // await requireRole(event, auth, ['admin'])
  const env = getCloudflareEnv(event)

  const rooms = await env.DB.prepare(
    `SELECT id, name, location, capacity, description, COALESCE(available_for_booking, 1) AS available_for_booking, created_at, updated_at
     FROM rooms
     WHERE deleted_at IS NULL AND COALESCE(available_for_booking, 1) = 1`,
  ).all<{
    id: number
    name: string | null
    location: string | null
    capacity: number | null
    description: string | null
    available_for_booking: number | null
    created_at: string | null
    updated_at: string | null
  }>()

  return { ok: true, rooms: rooms.results }
})

