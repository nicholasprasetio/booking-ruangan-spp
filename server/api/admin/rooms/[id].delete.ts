
import { getCloudflareEnv } from '../../../utils/cf-env'

import { requireAuth } from '../../../utils/auth'

import { requireRole } from '../../../utils/roles'



export default defineEventHandler(async (event) => {

  const auth = await requireAuth(event)

  requireRole(event, auth, ['admin'])



  const env = getCloudflareEnv(event)

  const id = getRouterParam(event, 'id')



  if (!id || isNaN(Number(id))) {

    throw createError({

      statusCode: 400,

      statusMessage: 'Invalid room ID',

    })

  }



  // Check if room exists

  const existing = await env.DB.prepare(

    `SELECT id

     FROM rooms

     WHERE id = ? AND deleted_at IS NULL`,

  )

    .bind(id)

    .first()



  if (!existing) {

    throw createError({

      statusCode: 404,

      statusMessage: 'Room not found',

    })

  }



  // Check if room has active bookings

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')



  const activeBookings = await env.DB.prepare(

    `SELECT COUNT(*) AS count

     FROM booking_occurrences bo

     JOIN bookings b ON b.id = bo.booking_id

     WHERE bo.room_id = ?

       AND b.deleted_at IS NULL

       AND bo.status IN ('pending', 'approved')

       AND bo.end_at >= ?`,

  )

    .bind(id, now)

    .first<{ count: number }>()



  if (activeBookings && Number(activeBookings.count) > 0) {

    throw createError({

      statusCode: 400,

      statusMessage: 'Cannot delete room with active or pending bookings',

    })

  }



  // Soft delete room

  await env.DB.prepare(

    `UPDATE rooms

     SET deleted_at = ?, updated_at = ?

     WHERE id = ?`,

  )

    .bind(now, now, id)

    .run()



  // Soft delete room photos

  const photos = await env.DB.prepare(

    `SELECT id, object_key

     FROM room_photos

     WHERE room_id = ? AND deleted_at IS NULL`,

  )

    .bind(id)

    .all<{ id: number; object_key: string }>()



  if (photos.results.length > 0) {

    await env.DB.prepare(

      `UPDATE room_photos

       SET deleted_at = ?

       WHERE room_id = ?`,

    )

      .bind(now, id)

      .run()

  }



  return {

    ok: true,

    message: 'Room deleted successfully',

  }

})

