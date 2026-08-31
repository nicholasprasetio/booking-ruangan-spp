import { createError } from 'h3'
import type { D1Database } from '@cloudflare/workers-types'
import type { JwtUserPayload } from './jwt'
import { hasRole } from './roles'

export async function getAppSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM app_settings WHERE `key` = ?1 LIMIT 1')
    .bind(key)
    .first<{ value: string }>()

  return row?.value ?? null
}

export async function getBookingMinLeadDays(db: D1Database): Promise<number> {
  const raw = await getAppSetting(db, 'booking_min_lead_days')
  const value = Number(raw ?? 0)
  if (!Number.isFinite(value) || value < 0) return 0
  return Math.trunc(value)
}

export type ExternalBookingLetterTemplate = {
  object_key: string | null
  file_name: string | null
  content_type: string | null
  file_size: number | null
  updated_at: string | null
  available: boolean
}

export async function getExternalBookingLetterTemplate(db: D1Database): Promise<ExternalBookingLetterTemplate> {
  const rows = await db
    .prepare(
      "SELECT `key`, value FROM app_settings WHERE `key` IN (" +
        "'external_booking_letter_template_object_key', " +
        "'external_booking_letter_template_file_name', " +
        "'external_booking_letter_template_content_type', " +
        "'external_booking_letter_template_file_size', " +
        "'external_booking_letter_template_updated_at'" +
      ")",
    )
    .all<{ key: string; value: string }>()

  const values = new Map((rows.results || []).map((row) => [row.key, row.value]))
  const objectKey = values.get('external_booking_letter_template_object_key') || ''
  const fileSize = Number(values.get('external_booking_letter_template_file_size') || 0)

  return {
    object_key: objectKey || null,
    file_name: values.get('external_booking_letter_template_file_name') || null,
    content_type: values.get('external_booking_letter_template_content_type') || null,
    file_size: Number.isFinite(fileSize) && fileSize > 0 ? fileSize : null,
    updated_at: values.get('external_booking_letter_template_updated_at') || null,
    available: Boolean(objectKey),
  }
}

export function jakartaTodayYmd(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)

  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value

  return `${y}-${m}-${d}`
}

export function addDaysToYmd(ymd: string, days: number): string {
  const match = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return ymd
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export async function ensureBookingLeadTime(
  db: D1Database,
  auth: JwtUserPayload,
  dates: string[],
): Promise<void> {
  if (hasRole(auth, 'admin')) return

  const minLeadDays = await getBookingMinLeadDays(db)
  if (minLeadDays <= 0) return

  const minDate = addDaysToYmd(jakartaTodayYmd(), minLeadDays)
  const invalid = dates.find((date) => date < minDate)
  if (!invalid) return

  throw createError({
    statusCode: 400,
    statusMessage: `Peminjaman harus diajukan minimal ${minLeadDays} hari sebelumnya (tanggal paling cepat ${minDate})`,
  })
}
