import { createError, readBody } from 'h3'
import { getCloudflareEnv } from '../../../../utils/cf-env'
import { requireAuth } from '../../../../utils/auth'
import { requireRole } from '../../../../utils/roles'
import { nowIso } from '../../../../utils/booking-v2'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireRole(event, auth, ['admin'])

  const env = getCloudflareEnv(event)
  const id = Number(event.context.params?.id)
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Invalid request id' })

  const body = await readBody<{ reason?: string }>(event)
  const reason = typeof body?.reason === 'string' ? body.reason.trim() : ''
  if (!reason) {
    throw createError({ statusCode: 400, statusMessage: 'Alasan penolakan wajib diisi' })
  }
  if (reason.length > 500) {
    throw createError({ statusCode: 400, statusMessage: 'Alasan penolakan terlalu panjang' })
  }

  const existing = await env.DB
    .prepare(`SELECT id, status FROM external_booking_requests WHERE id = ?1 LIMIT 1`)
    .bind(id)
    .first<{ id: number; status: string }>()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Pengajuan external tidak ditemukan' })
  if (existing.status !== 'pending') {
    throw createError({ statusCode: 409, statusMessage: 'Pengajuan ini sudah diproses' })
  }

  const at = nowIso()
  await env.DB
    .prepare(
      `UPDATE external_booking_requests
       SET status = 'rejected',
           rejection_reason = ?2,
           reviewed_by = ?3,
           reviewed_at = ?4,
           updated_at = ?4
       WHERE id = ?1`,
    )
    .bind(id, reason, Number(auth.sub), at)
    .run()

  return { ok: true, requestId: id, status: 'rejected' }
})
