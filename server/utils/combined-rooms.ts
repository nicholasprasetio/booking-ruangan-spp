import { createError } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import { toMinutes } from './booking-slots'

export type CombinedMember = {
  id: number
  name: string | null
  capacity: number | null
  location: string | null
  open_time_start: string | null
  open_time_end: string | null
  slot_minutes: number | null
  available_for_booking: number | null
  is_combined: number | null
  deleted_at: string | null
}

export type CombinedRoomMetadata = {
  capacity: number | null
  location: string | null
  open_time_start: string
  open_time_end: string
  slot_minutes: number
}

export function nowDb(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export async function getCombinedMembers(db: D1Database, combinedRoomId: number): Promise<CombinedMember[]> {
  const result = await db.prepare(
    `SELECT r.id, r.name, r.capacity, r.location, r.open_time_start, r.open_time_end, r.slot_minutes,
            COALESCE(r.available_for_booking, 1) AS available_for_booking, COALESCE(r.is_combined, 0) AS is_combined,
            r.deleted_at
     FROM room_combined_members m
     JOIN rooms r ON r.id = m.member_room_id
     WHERE m.combined_room_id = ?1
     ORDER BY r.name ASC, r.id ASC`,
  ).bind(combinedRoomId).all<CombinedMember>()
  return result.results || []
}

export function deriveCombinedMetadata(members: CombinedMember[]): CombinedRoomMetadata {
  if (members.length < 2) throw createError({ statusCode: 400, statusMessage: 'Ruangan gabungan membutuhkan minimal dua ruangan satuan' })
  if (members.some((member) => member.deleted_at || Number(member.is_combined))) {
    throw createError({ statusCode: 400, statusMessage: 'Anggota ruangan gabungan harus berupa ruangan satuan aktif' })
  }
  const intervals = new Set(members.map((member) => Number(member.slot_minutes || 60)))
  if (intervals.size !== 1) throw createError({ statusCode: 400, statusMessage: 'Semua ruangan satuan harus memakai interval slot yang sama' })
  const starts = members.map((member) => toMinutes(member.open_time_start || '00:00'))
  const ends = members.map((member) => toMinutes(member.open_time_end || '24:00'))
  const start = Math.max(...starts)
  const end = Math.min(...ends)
  if (end <= start) throw createError({ statusCode: 400, statusMessage: 'Jam operasional ruangan satuan tidak memiliki irisan' })
  const format = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  const capacities = members.map((member) => Number(member.capacity)).filter((value) => Number.isFinite(value) && value > 0)
  const locations = Array.from(new Set(members.map((member) => member.location?.trim()).filter(Boolean)))
  return {
    capacity: capacities.length ? capacities.reduce((total, value) => total + value, 0) : null,
    location: locations.length ? locations.join(' / ') : null,
    open_time_start: format(start),
    open_time_end: format(end),
    slot_minutes: [...intervals][0]!,
  }
}

export async function validateCombinedMemberIds(db: D1Database, memberIds: unknown[]): Promise<CombinedMember[]> {
  const uniqueIds = Array.from(new Set(memberIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)))
  if (uniqueIds.length !== memberIds.length || uniqueIds.length < 2) {
    throw createError({ statusCode: 400, statusMessage: 'Pilih minimal dua ruangan satuan yang berbeda' })
  }
  const placeholders = uniqueIds.map(() => '?').join(', ')
  const result = await db.prepare(
    `SELECT id, name, capacity, location, open_time_start, open_time_end, slot_minutes,
            COALESCE(available_for_booking, 1) AS available_for_booking, COALESCE(is_combined, 0) AS is_combined,
            deleted_at
     FROM rooms WHERE id IN (${placeholders})`,
  ).bind(...uniqueIds).all<CombinedMember>()
  const members = result.results || []
  if (members.length !== uniqueIds.length) throw createError({ statusCode: 400, statusMessage: 'Salah satu ruangan satuan tidak ditemukan' })
  deriveCombinedMetadata(members)
  return members
}

export async function refreshCombinedMetadataForMembers(db: D1Database, memberRoomId: number): Promise<void> {
  const groups = await db.prepare('SELECT combined_room_id FROM room_combined_members WHERE member_room_id = ?1').bind(memberRoomId).all<{ combined_room_id: number }>()
  for (const row of groups.results || []) {
    const members = await getCombinedMembers(db, Number(row.combined_room_id))
    const metadata = deriveCombinedMetadata(members)
    await db.prepare(
      `UPDATE rooms SET capacity = ?2, location = ?3, open_time_start = ?4, open_time_end = ?5, slot_minutes = ?6, updated_at = ?7 WHERE id = ?1`,
    ).bind(row.combined_room_id, metadata.capacity, metadata.location, metadata.open_time_start, metadata.open_time_end, metadata.slot_minutes, nowDb()).run()
  }
}

export async function getBlockingRoomIds(db: D1Database, roomId: number): Promise<number[]> {
  const room = await db.prepare('SELECT COALESCE(is_combined, 0) AS is_combined FROM rooms WHERE id = ?1 AND deleted_at IS NULL').bind(roomId).first<{ is_combined: number }>()
  if (!room) return [roomId]
  if (Number(room.is_combined)) {
    const members = await getCombinedMembers(db, roomId)
    return [roomId, ...members.filter((member) => !member.deleted_at).map((member) => Number(member.id))]
  }
  const groups = await db.prepare(
    `SELECT m.combined_room_id FROM room_combined_members m JOIN rooms r ON r.id = m.combined_room_id
     WHERE m.member_room_id = ?1 AND r.deleted_at IS NULL`,
  ).bind(roomId).all<{ combined_room_id: number }>()
  return [roomId, ...(groups.results || []).map((row) => Number(row.combined_room_id))]
}

export async function ensureCombinedRoomAvailable(db: D1Database, roomId: number): Promise<void> {
  const unavailable = await db.prepare(
    `SELECT r.name FROM room_combined_members m JOIN rooms r ON r.id = m.member_room_id
     WHERE m.combined_room_id = ?1 AND (r.deleted_at IS NOT NULL OR COALESCE(r.available_for_booking, 1) = 0) LIMIT 1`,
  ).bind(roomId).first<{ name: string | null }>()
  if (unavailable) throw createError({ statusCode: 409, statusMessage: `Ruangan satuan ${unavailable.name || ''} tidak tersedia untuk booking` })
}

export async function ensureNoCombinedSlotOverlap(
  db: D1Database,
  roomId: number,
  slots: Array<{ start: string; end: string }>,
  message: string,
  options: { excludeBookingId?: number; excludeOccurrenceId?: number } = {},
): Promise<void> {
  if (!slots.length) return
  const relatedIds = await getBlockingRoomIds(db, roomId)
  const roomPlaceholders = relatedIds.map((_, i) => `?${i + 1}`).join(', ')
  for (let i = 0; i < slots.length; i += 35) {
    const chunk = slots.slice(i, i + 35)
    const slotSql = chunk.map(() => '(bos.start_at < ? AND bos.end_at > ?)').join(' OR ')
    const binds: unknown[] = [...relatedIds]
    for (const slot of chunk) binds.push(slot.end, slot.start)
    let exclusion = ''
    if (options.excludeBookingId) { exclusion += ' AND b.id != ?'; binds.push(options.excludeBookingId) }
    if (options.excludeOccurrenceId) { exclusion += ' AND bo.id != ?'; binds.push(options.excludeOccurrenceId) }
    const overlap = await db.prepare(
      `SELECT bos.start_at FROM booking_occurrence_slots bos JOIN booking_occurrences bo ON bo.id = bos.occurrence_id
       JOIN bookings b ON b.id = bo.booking_id
       WHERE COALESCE(bo.room_id, b.room_id) IN (${roomPlaceholders}) AND b.deleted_at IS NULL
         AND bo.status IN ('pending','approved')${exclusion} AND (${slotSql}) LIMIT 1`,
    ).bind(...binds).first<{ start_at: string }>()
    if (overlap) throw createError({ statusCode: 409, statusMessage: message })
  }
}

export function slotRangesFromStarts(starts: string[], slotMinutes: number): Array<{ start: string; end: string }> {
  const addMinutes = (value: string) => {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
    if (!match) throw createError({ statusCode: 400, statusMessage: 'Invalid slot datetime' })
    const [, y, mo, d, h, m, s] = match
    const next = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(m), Number(s)) + slotMinutes * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())} ${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`
  }
  return starts.map((start) => ({ start, end: addMinutes(start) }))
}
