import { createError } from 'h3'

/**
 * Normalize Indonesian phone numbers to digits-only and always start with "628".
 *
 * Accepted examples:
 * - 0812xxxx -> 62812xxxx
 * - 812xxxx  -> 62812xxxx
 * - +62812xx -> 62812xx
 * - 62812xx  -> 62812xx
 */
export function normalizePhoneTo628(input: string): string {
  const raw = String(input || '').trim()
  if (!raw) {
    throw createError({ statusCode: 400, statusMessage: 'phoneNumber is required' })
  }

  // digits only
  let digits = raw.replace(/[^\d]/g, '')

  // remove leading country code variants
  if (digits.startsWith('0')) {
    digits = digits.slice(1) // 0812... -> 812...
  }
  if (digits.startsWith('62')) {
    digits = digits.slice(2) // 62 812... -> 812...
  }

  // now digits should start with 8 for Indonesian mobile numbers; normalize to 628...
  if (!digits.startsWith('8')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid phone number (must be Indonesian number starting with 08/8/62/628)',
    })
  }

  const normalized = `628${digits.slice(1)}`

  // basic length sanity: 628 + 7..12 digits (total 10..15 digits)
  if (!/^628\d{7,12}$/.test(normalized)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid phone number length' })
  }

  return normalized
}

