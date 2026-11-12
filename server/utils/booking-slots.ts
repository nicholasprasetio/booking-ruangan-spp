import { createError } from 'h3'

export function toIsoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

/**
 * Adds minutes to a WIB wall-clock DATETIME string ("YYYY-MM-DD HH:MM:SS")
 * without going through the server's local timezone. `new Date(value)` would
 * read the string as server-local time and `toISOString()` would then shift it.
 */
export function addMinutesToWibDatetime(value: string, minutes: number): string {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (!match) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid slot datetime' })
  }
  const [, y, mo, d, h, mi, se = '0'] = match
  const next = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se)) + minutes * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())} ${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}:${pad(next.getUTCSeconds())}`
}

export function assertTime(t: string, invalidTimeFormatMessage = 'Invalid time (expected HH:MM)'): void {
  if (!/^\d{2}:\d{2}$/.test(t)) {
    throw createError({ statusCode: 400, statusMessage: invalidTimeFormatMessage })
  }
}

export function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number)
  return h * 60 + m
}

export function toUniqueSlotLabels(slots: unknown[], invalidSlotTimeMessage = 'Invalid slot time'): string[] {
  const uniqueRaw = Array.from(new Set(slots))
  const uniqueSlots: string[] = []

  for (const slot of uniqueRaw) {
    if (typeof slot !== 'string') {
      throw createError({ statusCode: 400, statusMessage: invalidSlotTimeMessage })
    }
    uniqueSlots.push(slot)
  }

  return uniqueSlots
}

type BuildSlotStartIsosForDateInput = {
  ymd: string
  slots: string[]
  openStartMin: number
  openEndMin: number
  slotMinutes: number
  tzOffset?: string
  invalidTimeFormatMessage?: string
  outOfHoursMessage?: string
  misalignedMessage?: string
  invalidDateTimeMessage?: string
}

export function buildSlotStartIsosForDate(input: BuildSlotStartIsosForDateInput): string[] {
  const {
    ymd,
    slots,
    openStartMin,
    openEndMin,
    slotMinutes,
    tzOffset = '+07:00',
    invalidTimeFormatMessage = 'Invalid time (expected HH:MM)',
    outOfHoursMessage = 'Slot is outside room operational hours',
    misalignedMessage = 'Slot must align with room slot interval',
    invalidDateTimeMessage = 'Invalid slot datetime',
  } = input

  const slotStartIsos: string[] = []
  for (const slot of slots) {
    assertTime(slot, invalidTimeFormatMessage)

    const slotMin = toMinutes(slot)
    if (slotMin < openStartMin || slotMin + slotMinutes > openEndMin) {
      throw createError({ statusCode: 400, statusMessage: outOfHoursMessage })
    }
    if ((slotMin - openStartMin) % slotMinutes !== 0) {
      throw createError({ statusCode: 400, statusMessage: misalignedMessage })
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
      throw createError({ statusCode: 400, statusMessage: invalidDateTimeMessage })
    }

    // Simpan sebagai MySQL DATETIME wall-clock Asia/Jakarta (WIB).
    slotStartIsos.push(`${ymd} ${slot}:00`)
  }

  return slotStartIsos
}
