
import { createError, getRouterParam } from 'h3'

import { getCloudflareEnv } from '../../../../utils/cf-env'

import { requireAuth } from '../../../../utils/auth'

import { requireRole } from '../../../../utils/roles'

import { nowIso } from '../../../../utils/booking-v2'



export default defineEventHandler(async (event) => {

  const auth = await requireAuth(event)

  requireRole(event, auth, ['admin'])



  const env = getCloudflareEnv(event)

  const keyId = Number(getRouterParam(event, 'id'))



  if (!Number.isInteger(keyId) || keyId <= 0) {

    throw createError({ statusCode: 400, statusMessage: 'Invalid key id' })

  }



  const row = await env.DB.prepare(

    `SELECT id, booking_id, occurrence_id, picked_up_at, picked_up_by, returned_at

     FROM booking_key_tokens

     WHERE id = ?1

     LIMIT 1`,

  ).bind(keyId).first<{

    id: number

    booking_id: number

    occurrence_id: number

    picked_up_at: string | null

    picked_up_by: number | null

    returned_at: string | null

  }>()



  if (!row) {

    throw createError({ statusCode: 404, statusMessage: 'Key record not found' })

  }



  if (!row.picked_up_at) {

    throw createError({ statusCode: 409, statusMessage: 'Kunci belum tercatat diambil' })

  }



  if (row.returned_at) {

    throw createError({

      statusCode: 409,

      statusMessage: 'Kunci sudah dikembalikan, pengambilan tidak bisa dibatalkan',

    })

  }



  const at = nowIso()



  await env.DB.batch([

    env.DB.prepare(

      `UPDATE booking_key_tokens

       SET picked_up_at = NULL,

           picked_up_by = NULL,

           updated_at = ?2

       WHERE id = ?1`,

    ).bind(keyId, at),



    env.DB.prepare(

      `INSERT INTO booking_key_events

       (key_token_id, booking_id, occurrence_id, actor_user_id, type, created_at)

       VALUES (?1, ?2, ?3, ?4, 'pickup_canceled', ?5)`,

    ).bind(keyId, row.booking_id, row.occurrence_id, Number(auth.sub), at),



    env.DB.prepare(

      `INSERT INTO booking_events

       (booking_id, occurrence_id, actor_user_id, type, payload, created_at)

       VALUES (?1, ?2, ?3, 'key_pickup_canceled', ?4, ?5)`,

    ).bind(

      row.booking_id,

      row.occurrence_id,

      Number(auth.sub),

      JSON.stringify({

        keyTokenId: keyId,

        previousPickedUpAt: row.picked_up_at,

        previousPickedUpBy: row.picked_up_by,

        canceledAt: at,

      }),

      at,

    ),

  ])



  return {

    ok: true,

    keyId,

    bookingId: Number(row.booking_id),

    occurrenceId: Number(row.occurrence_id),

    status: 'ready',

  }

})

