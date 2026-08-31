import { createError } from 'h3'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type RecurrenceRule = {
  frequency: RecurrenceFrequency
  until: string
  interval: number
  weeklyDays?: number[]
  monthlyDay?: number
  yearlyMonth?: number
  yearlyDay?: number
}

type ParseRecurrenceRuleInput = {
  recurrence: {
    frequency?: RecurrenceFrequency
    until?: string
    interval?: number
    weeklyDays?: number[]
    monthlyDay?: number
    yearlyMonth?: number
    yearlyDay?: number
  } | null | undefined
  requireFrequencyAndUntilMessage?: string
  invalidUntilMessage?: string
  invalidIntervalMessage?: string
}

export function parseRecurrenceRule(input: ParseRecurrenceRuleInput): RecurrenceRule {
  const {
    recurrence,
    requireFrequencyAndUntilMessage = 'recurrence.frequency and recurrence.until are required',
    invalidUntilMessage = 'Invalid recurrence.until (expected YYYY-MM-DD)',
    invalidIntervalMessage = 'recurrence.interval must be an integer >= 1',
  } = input

  const frequency = recurrence?.frequency
  const until = recurrence?.until
  if (!frequency || !until) {
    throw createError({ statusCode: 400, statusMessage: requireFrequencyAndUntilMessage })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) {
    throw createError({ statusCode: 400, statusMessage: invalidUntilMessage })
  }

  const intervalRaw = recurrence?.interval
  const interval = intervalRaw === undefined || intervalRaw === null ? 1 : Number(intervalRaw)
  if (!Number.isInteger(interval) || interval < 1) {
    throw createError({ statusCode: 400, statusMessage: invalidIntervalMessage })
  }

  const weeklyDays = Array.isArray(recurrence?.weeklyDays) ? recurrence!.weeklyDays : undefined
  const monthlyDay = recurrence?.monthlyDay
  const yearlyMonth = recurrence?.yearlyMonth
  const yearlyDay = recurrence?.yearlyDay

  return {
    frequency,
    until,
    interval,
    ...(weeklyDays ? { weeklyDays } : {}),
    ...(monthlyDay !== undefined && monthlyDay !== null ? { monthlyDay: Number(monthlyDay) } : {}),
    ...(yearlyMonth !== undefined && yearlyMonth !== null ? { yearlyMonth: Number(yearlyMonth) } : {}),
    ...(yearlyDay !== undefined && yearlyDay !== null ? { yearlyDay: Number(yearlyDay) } : {}),
  }
}

function parseYmd(ymd: string): { y: number; m: number; d: number } {
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) throw createError({ statusCode: 400, statusMessage: 'Invalid date (expected YYYY-MM-DD)' })
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function addMonthsClamped(base: { y: number; m: number; d: number }, monthsToAdd: number): { y: number; m: number; d: number } {
  const total = (base.m - 1) + monthsToAdd
  const y = base.y + Math.floor(total / 12)
  const m = (total % 12 + 12) % 12 + 1
  const dim = daysInMonth(y, m)
  const d = Math.min(base.d, dim)
  return { y, m, d }
}

function toYmd(p: { y: number; m: number; d: number }): string {
  return `${String(p.y).padStart(4, '0')}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`
}

function ymdToUtcMs(ymd: string): number {
  const p = parseYmd(ymd)
  return Date.UTC(p.y, p.m - 1, p.d)
}

function utcMsToYmd(ms: number): string {
  const d = new Date(ms)
  return toYmd({ y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() })
}

function generateDatesDaily(startYmd: string, untilYmd: string, interval: number, maxOccurrences: number): string[] {
  const startMs = ymdToUtcMs(startYmd)
  const untilMs = ymdToUtcMs(untilYmd)
  if (untilYmd < startYmd) {
    throw createError({ statusCode: 400, statusMessage: 'recurrence.until must be on/after date' })
  }

  const stepMs = interval * 24 * 60 * 60 * 1000
  const dates: string[] = []
  for (let i = 0; i < maxOccurrences; i++) {
    const ms = startMs + i * stepMs
    if (ms > untilMs) break
    dates.push(utcMsToYmd(ms))
  }

  if (dates.length === maxOccurrences) {
    throw createError({ statusCode: 400, statusMessage: `Too many occurrences (max ${maxOccurrences})` })
  }
  return dates
}

function generateDatesWeekly(
  startYmd: string,
  untilYmd: string,
  intervalWeeks: number,
  weekdays: number[],
  maxOccurrences: number,
): string[] {
  const startMs = ymdToUtcMs(startYmd)
  const untilMs = ymdToUtcMs(untilYmd)
  if (untilYmd < startYmd) {
    throw createError({ statusCode: 400, statusMessage: 'recurrence.until must be on/after date' })
  }

  const wanted = new Set(weekdays)
  const dates: string[] = []

  for (let ms = startMs, guard = 0; ms <= untilMs && guard < 4000; ms += 24 * 60 * 60 * 1000, guard++) {
    const diffDays = Math.floor((ms - startMs) / (24 * 60 * 60 * 1000))
    const weekIndex = Math.floor(diffDays / 7)
    if (weekIndex % intervalWeeks !== 0) continue

    const d = new Date(ms)
    const wd = d.getUTCDay()
    if (!wanted.has(wd)) continue

    dates.push(utcMsToYmd(ms))
    if (dates.length >= maxOccurrences) {
      throw createError({ statusCode: 400, statusMessage: `Too many occurrences (max ${maxOccurrences})` })
    }
  }

  return dates
}

function generateDatesMonthly(
  startYmd: string,
  untilYmd: string,
  intervalMonths: number,
  dayOfMonth: number,
  maxOccurrences: number,
): string[] {
  if (untilYmd < startYmd) {
    throw createError({ statusCode: 400, statusMessage: 'recurrence.until must be on/after date' })
  }

  const start = parseYmd(startYmd)
  const dates: string[] = []

  let cur = { y: start.y, m: start.m, d: dayOfMonth }
  for (let i = 0; i < maxOccurrences; i++) {
    const dim = daysInMonth(cur.y, cur.m)
    const d = Math.min(dayOfMonth, dim)
    const ymd = toYmd({ y: cur.y, m: cur.m, d })

    if (ymd < startYmd) {
      cur = addMonthsClamped({ y: cur.y, m: cur.m, d: 1 }, intervalMonths)
      continue
    }
    if (ymd > untilYmd) break

    dates.push(ymd)
    cur = addMonthsClamped({ y: cur.y, m: cur.m, d: 1 }, intervalMonths)
  }

  if (dates.length === maxOccurrences) {
    throw createError({ statusCode: 400, statusMessage: `Too many occurrences (max ${maxOccurrences})` })
  }

  return dates
}

function generateDatesYearly(
  startYmd: string,
  untilYmd: string,
  intervalYears: number,
  month: number,
  dayOfMonth: number,
  maxOccurrences: number,
): string[] {
  if (untilYmd < startYmd) {
    throw createError({ statusCode: 400, statusMessage: 'recurrence.until must be on/after date' })
  }

  const start = parseYmd(startYmd)
  const dates: string[] = []
  let y = start.y

  for (let i = 0; i < maxOccurrences; i++) {
    const dim = daysInMonth(y, month)
    const d = Math.min(dayOfMonth, dim)
    const ymd = toYmd({ y, m: month, d })

    if (ymd < startYmd) {
      y += intervalYears
      continue
    }
    if (ymd > untilYmd) break

    dates.push(ymd)
    y += intervalYears
  }

  if (dates.length === maxOccurrences) {
    throw createError({ statusCode: 400, statusMessage: `Too many occurrences (max ${maxOccurrences})` })
  }

  return dates
}

type GenerateRecurrenceDatesInput = {
  startYmd: string
  untilYmd: string
  frequency: RecurrenceFrequency
  interval: number
  weeklyDays?: number[]
  monthlyDay?: number
  yearlyMonth?: number
  yearlyDay?: number
  maxOccurrences: number
}

export function generateRecurrenceDates(input: GenerateRecurrenceDatesInput): string[] {
  const { startYmd, untilYmd, frequency, interval, weeklyDays, monthlyDay, yearlyMonth, yearlyDay, maxOccurrences } = input

  if (frequency === 'daily') {
    return generateDatesDaily(startYmd, untilYmd, interval, maxOccurrences)
  }

  if (frequency === 'weekly') {
    const days = Array.isArray(weeklyDays) ? weeklyDays : []
    if (!days.length) {
      const d = new Date(ymdToUtcMs(startYmd))
      return generateDatesWeekly(startYmd, untilYmd, interval, [d.getUTCDay()], maxOccurrences)
    }
    const unique = Array.from(new Set(days.map((n) => Number(n)))).filter((n) => Number.isFinite(n) && n >= 0 && n <= 6)
    if (!unique.length) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid recurrence.weeklyDays' })
    }
    return generateDatesWeekly(startYmd, untilYmd, interval, unique, maxOccurrences)
  }

  if (frequency === 'monthly') {
    const day = monthlyDay ? Number(monthlyDay) : parseYmd(startYmd).d
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid recurrence.monthlyDay' })
    }
    return generateDatesMonthly(startYmd, untilYmd, interval, day, maxOccurrences)
  }

  const m = yearlyMonth ? Number(yearlyMonth) : parseYmd(startYmd).m
  const d = yearlyDay ? Number(yearlyDay) : parseYmd(startYmd).d
  if (!Number.isFinite(m) || m < 1 || m > 12) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recurrence.yearlyMonth' })
  }
  if (!Number.isFinite(d) || d < 1 || d > 31) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid recurrence.yearlyDay' })
  }
  return generateDatesYearly(startYmd, untilYmd, interval, m, d, maxOccurrences)
}
