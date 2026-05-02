export const DEFAULT_TIMEZONE = 'UTC'

interface DateParts {
  year: number
  month: number
  day: number
}

function parseOffsetToMinutes(offset: string): number {
  if (offset === 'GMT' || offset === 'UTC') {
    return 0
  }

  const match = offset.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/)
  if (!match) {
    return 0
  }

  const sign = match[1] === '-' ? -1 : 1
  const hours = Number.parseInt(match[2] || '0', 10)
  const minutes = Number.parseInt(match[3] || '0', 10)

  return sign * (hours * 60 + minutes)
}

export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(value: unknown): string {
  return isValidTimeZone(value) ? value : DEFAULT_TIMEZONE
}

export function getDatePartsInTimeZone(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(date)
  const year = Number.parseInt(parts.find((part) => part.type === 'year')?.value || '0', 10)
  const month = Number.parseInt(parts.find((part) => part.type === 'month')?.value || '1', 10)
  const day = Number.parseInt(parts.find((part) => part.type === 'day')?.value || '1', 10)

  return { year, month, day }
}

export function datePartsToDayKey(parts: DateParts): string {
  const year = String(parts.year).padStart(4, '0')
  const month = String(parts.month).padStart(2, '0')
  const day = String(parts.day).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getDayKeyInTimeZone(date: Date, timeZone: string): string {
  return datePartsToDayKey(getDatePartsInTimeZone(date, timeZone))
}

export function shiftDatePartsByDays(parts: DateParts, days: number): DateParts {
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days))
  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  }
}

export function getTimeZoneOffsetMinutes(at: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timeZone),
    timeZoneName: 'shortOffset'
  })
  const parts = formatter.formatToParts(at)
  const offsetPart = parts.find((part) => part.type === 'timeZoneName')?.value || 'GMT'
  return parseOffsetToMinutes(offsetPart)
}

export function getStartOfDayUTCInTimeZoneFromParts(parts: DateParts, timeZone: string): Date {
  const normalizedTimeZone = normalizeTimeZone(timeZone)
  const utcMillisAtMidnight = Date.UTC(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0)
  let candidate = utcMillisAtMidnight

  // Iterate to account for DST transitions around local midnight.
  for (let index = 0; index < 3; index += 1) {
    const offsetMinutes = getTimeZoneOffsetMinutes(new Date(candidate), normalizedTimeZone)
    const nextCandidate = utcMillisAtMidnight - offsetMinutes * 60 * 1000
    if (nextCandidate === candidate) {
      break
    }
    candidate = nextCandidate
  }

  return new Date(candidate)
}

export function getStartOfDayUTCInTimeZone(date: Date, timeZone: string): Date {
  const parts = getDatePartsInTimeZone(date, timeZone)
  return getStartOfDayUTCInTimeZoneFromParts(parts, timeZone)
}

export function getMonthUtcRangeInTimeZone(year: number, month: number, timeZone: string): {
  start: Date
  end: Date
} {
  const start = getStartOfDayUTCInTimeZoneFromParts({ year, month, day: 1 }, timeZone)
  const nextMonth = month === 12
    ? { year: year + 1, month: 1 }
    : { year, month: month + 1 }
  const end = getStartOfDayUTCInTimeZoneFromParts(
    { year: nextMonth.year, month: nextMonth.month, day: 1 },
    timeZone
  )

  return { start, end }
}

export function getNowYearMonthInTimeZone(timeZone: string): { year: number; month: number } {
  const nowParts = getDatePartsInTimeZone(new Date(), timeZone)
  return { year: nowParts.year, month: nowParts.month }
}