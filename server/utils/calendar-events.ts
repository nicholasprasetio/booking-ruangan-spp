type CalendarSlotRange = {
  occurrence_id: number
  start_at: string
  end_at: string
}

/**
 * Combines consecutive slots from one occurrence for display in FullCalendar.
 * Booking slots remain separate in the database so availability validation is
 * unaffected.
 */
export function mergeContiguousCalendarSlots<T extends CalendarSlotRange>(rows: T[]): T[] {
  const byOccurrence = new Map<number, T[]>()

  for (const row of rows) {
    const slots = byOccurrence.get(row.occurrence_id) || []
    slots.push(row)
    byOccurrence.set(row.occurrence_id, slots)
  }

  const merged: T[] = []
  for (const slots of byOccurrence.values()) {
    const sorted = [...slots].sort((a, b) => a.start_at.localeCompare(b.start_at))
    let current: T | null = null

    for (const slot of sorted) {
      if (!current || slot.start_at > current.end_at) {
        current = { ...slot }
        merged.push(current)
        continue
      }

      if (slot.end_at > current.end_at) {
        current.end_at = slot.end_at
      }
    }
  }

  return merged.sort((a, b) => a.start_at.localeCompare(b.start_at))
}
