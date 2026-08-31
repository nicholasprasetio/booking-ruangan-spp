import { getCloudflareEnv } from '../../../utils/cf-env'
import { requireAuth } from '../../../utils/auth'
import { requireRole } from '../../../utils/roles'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const body = await readBody(event)

  const { name, location, capacity, description, open_time_start, open_time_end, slot_minutes } = body
  const available_for_booking = body?.available_for_booking === false ? 0 : 1

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'Room name is required' })
  }

  if ((open_time_start && !open_time_end) || (!open_time_start && open_time_end)) {
    throw createError({ statusCode: 400, statusMessage: 'Both open_time_start and open_time_end are required' })
  }
  if (open_time_start && !/^\d{2}:\d{2}$/.test(open_time_start)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid open_time_start (expected HH:MM)' })
  }
  if (open_time_end && !/^\d{2}:\d{2}$/.test(open_time_end)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid open_time_end (expected HH:MM)' })
  }
  if (open_time_start && open_time_end) {
    const [sh, sm] = open_time_start.split(':').map(Number)
    const [eh, em] = open_time_end.split(':').map(Number)
    if (sh * 60 + sm >= eh * 60 + em) {
      throw createError({ statusCode: 400, statusMessage: 'open_time_end must be after open_time_start' })
    }
  }
  if (slot_minutes !== undefined && slot_minutes !== null) {
    const slot = Number(slot_minutes)
    if (!Number.isFinite(slot) || slot < 15 || slot > 240) {
      throw createError({ statusCode: 400, statusMessage: 'slot_minutes must be between 15 and 240' })
    }
  }

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ').slice(0, 19).replace('T', ' ')
  const result = await env.DB.prepare(
    `INSERT INTO rooms (name, location, capacity, description, open_time_start, open_time_end, slot_minutes, available_for_booking, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      name.trim(),
      location?.trim() || null,
      capacity ? Number(capacity) : null,
      description?.trim() || null,
      open_time_start || null,
      open_time_end || null,
      slot_minutes !== undefined && slot_minutes !== null ? Number(slot_minutes) : null,
      available_for_booking,
      now,
      now
    )
    .run()

  return {
    ok: true,
    room: {
      id: result.meta.last_row_id,
      name: name.trim(),
      location: location?.trim() || null,
      capacity: capacity ? Number(capacity) : null,
      description: description?.trim() || null,
      open_time_start: open_time_start || null,
      open_time_end: open_time_end || null,
      slot_minutes: slot_minutes !== undefined && slot_minutes !== null ? Number(slot_minutes) : null,
      available_for_booking,
      created_at: now,
      updated_at: now,
    },
  }
})
