const DEFAULT_TIMEZONE = 'UTC'

interface DateParts {
  year: number
  month: number
  day: number
}

function normalizeTimeZone(timezone: string | undefined): string {
  if (!timezone) {
    return DEFAULT_TIMEZONE
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return timezone
  } catch {
    return DEFAULT_TIMEZONE
  }
}

function datePartsToKey(parts: DateParts): string {
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

function getDatePartsFromDate(date: Date, timezone: string): DateParts {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timezone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(date)

  return {
    year: Number.parseInt(parts.find((part) => part.type === 'year')?.value || '0', 10),
    month: Number.parseInt(parts.find((part) => part.type === 'month')?.value || '1', 10),
    day: Number.parseInt(parts.find((part) => part.type === 'day')?.value || '1', 10)
  }
}

export function getDayKeyInTimeZone(date: Date, timezone: string): string {
  return datePartsToKey(getDatePartsFromDate(date, timezone))
}

export function getTodayKeyInTimeZone(timezone: string): string {
  return getDayKeyInTimeZone(new Date(), timezone)
}

export function getCurrentYearMonthInTimeZone(timezone: string): { year: number; month: number } {
  const todayParts = getDatePartsFromDate(new Date(), timezone)
  return { year: todayParts.year, month: todayParts.month }
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

export function weekdayOfFirstDay(year: number, month: number): number {
  return new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
}

export function keyFromParts(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function formatMonthYear(year: number, month: number, timezone: string): string {
  return new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: normalizeTimeZone(timezone)
  })
}
