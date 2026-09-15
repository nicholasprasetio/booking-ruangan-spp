
import { getCloudflareEnv } from '../../../utils/cf-env'

import { requireAuth } from '../../../utils/auth'

import { requireRole } from '../../../utils/roles'



export default defineEventHandler(async (event) => {

  const auth = await requireAuth(event)

  requireRole(event, auth, ['admin'])



  const env = getCloudflareEnv(event)

  const body = await readBody(event)



  const ids: number[] = body?.ids



  if (!Array.isArray(ids) || ids.length === 0) {

    throw createError({

      statusCode: 400,

      statusMessage: 'ids must be a non-empty array',

    })

  }



  if (ids.length > 100) {

    throw createError({

      statusCode: 400,

      statusMessage: 'Maximum 100 rooms per batch',

    })

  }



  const deleted: number[] = []

  const failed: Array<{ id: number; reason: string }> = []

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')



  for (const id of ids) {

    if (!Number.isFinite(id) || id <= 0) {

      failed.push({ id, reason: 'Invalid room ID' })

      continue

    }



    // Check room exists

    const existing = await env.DB.prepare(

      `SELECT id, name

       FROM rooms

       WHERE id = ? AND deleted_at IS NULL`,

    )

      .bind(id)

      .first<{ id: number; name: string }>()



    if (!existing) {

      failed.push({ id, reason: 'Room not found' })

      continue

    }

    const usedByCombined = await env.DB.prepare(
      `SELECT r.name FROM room_combined_members m JOIN rooms r ON r.id = m.combined_room_id
       WHERE m.member_room_id = ?1 AND r.deleted_at IS NULL LIMIT 1`,
    ).bind(id).first<{ name: string | null }>()
    if (usedByCombined) {
      failed.push({ id, reason: `Ruangan masih digunakan oleh gabungan ${usedByCombined.name || ''}` })
      continue
    }



    // Check active bookings

    const activeBookings = await env.DB.prepare(

      `SELECT COUNT(*) AS count

       FROM booking_occurrences bo

       JOIN bookings b ON b.id = bo.booking_id

       WHERE COALESCE(bo.room_id, b.room_id) = ?

         AND b.deleted_at IS NULL

         AND bo.status IN ('pending', 'approved')

         AND bo.end_at >= ?`,

    )

      .bind(id, now)

      .first<{ count: number }>()



    if (activeBookings && Number(activeBookings.count) > 0) {

      failed.push({

        id,

        reason: `Ruangan "${existing.name}" memiliki peminjaman aktif`,

      })

      continue

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

    await env.DB.prepare(

      `UPDATE room_photos

       SET deleted_at = ?

       WHERE room_id = ? AND deleted_at IS NULL`,

    )

      .bind(now, id)

      .run()



    deleted.push(id)

  }



  return {

    ok: true,

    deleted,

    failed,

  }

})

