import { createError } from 'h3'

export function toIsoNoMs(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
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

    const slotStart = new Date(`${ymd}T${slot}:00.000${tzOffset}`)
    if (isNaN(slotStart.getTime())) {
      throw createError({ statusCode: 400, statusMessage: invalidDateTimeMessage })
    }

    slotStartIsos.push(toIsoNoMs(slotStart))
  }

  return slotStartIsos
}
