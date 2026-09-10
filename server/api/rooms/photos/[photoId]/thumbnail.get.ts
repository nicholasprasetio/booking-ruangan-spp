
import { promises as fs } from 'node:fs'

import path from 'node:path'

import { getCloudflareEnv } from '../../../../utils/cf-env'



const THUMB_DIR = '/home/jelastic/ROOT/uploads/room-photos/thumbs'



export default defineEventHandler(async (event) => {

  const env = getCloudflareEnv(event)



  const photoId = getRouterParam(event, 'photoId')

  if (!photoId || isNaN(Number(photoId))) {

    throw createError({ statusCode: 400, statusMessage: 'Invalid photo ID' })

  }



  const photo = await env.DB.prepare(

    `SELECT object_key

     FROM room_photos

     WHERE id = ? AND deleted_at IS NULL`,

  )

    .bind(photoId)

    .first<{ object_key: string }>()



  if (!photo) {

    throw createError({ statusCode: 404, statusMessage: 'Photo not found' })

  }



  const filename = path.basename(photo.object_key)

  const thumbPath = path.join(THUMB_DIR, `${filename}.jpg`)



  try {

    const data = await fs.readFile(thumbPath)



    return new Response(data, {

      headers: {

        'Content-Type': 'image/jpeg',

        'Cache-Control': 'public, max-age=86400, immutable',

      },

    })

  } catch {

    throw createError({

      statusCode: 404,

      statusMessage: 'Thumbnail not found',

    })

  }

})

