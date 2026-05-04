import { JournalEntry } from '../../models/JournalEntry'
import { User } from '../../models/User'
import {
  createDayKeyGetter,
  datePartsToDayKey,
  DEFAULT_TIMEZONE,
  getDatePartsInTimeZone,
  getNowYearMonthInTimeZone,
  getStartOfDayUTCInTimeZoneFromParts,
  shiftDatePartsByDays
} from '../../utils/timezone'

function getCalendarGridRange(year: number, month: number, timeZone: string): {
  start: Date
  end: Date
} {
  const firstDayParts = { year, month, day: 1 }
  const firstDayOfWeek = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const gridStartParts = shiftDatePartsByDays(firstDayParts, -firstDayOfWeek)
  const gridEndParts = shiftDatePartsByDays(gridStartParts, 42)

  return {
    start: getStartOfDayUTCInTimeZoneFromParts(gridStartParts, timeZone),
    end: getStartOfDayUTCInTimeZoneFromParts(gridEndParts, timeZone)
  }
}

function computeStreak(dateKeys: Set<string>, timeZone: string): number {
  let streak = 0
  let cursor = getDatePartsInTimeZone(new Date(), timeZone)

  while (dateKeys.has(datePartsToDayKey(cursor))) {
    streak += 1
    cursor = shiftDatePartsByDays(cursor, -1)
  }

  return streak
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await User.findById(userId).select('timezone').lean()
  const timeZone = user?.timezone || DEFAULT_TIMEZONE

  const query = getQuery(event)
  const nowInTimeZone = getNowYearMonthInTimeZone(timeZone)

  const rawYear = Number.parseInt(String(query.year ?? nowInTimeZone.year), 10)
  const rawMonth = Number.parseInt(String(query.month ?? nowInTimeZone.month), 10)

  const year = Number.isNaN(rawYear) ? nowInTimeZone.year : rawYear
  const month = Number.isNaN(rawMonth) ? nowInTimeZone.month : rawMonth

  if (month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'month must be between 1 and 12' })
  }

  const { start: gridStart, end: gridEnd } = getCalendarGridRange(year, month, timeZone)

  const [visibleEntries, allEntries] = await Promise.all([
    JournalEntry.find({
      userId,
      created_at: { $gte: gridStart, $lt: gridEnd }
    })
      .sort({ created_at: -1 })
      .lean(),
    JournalEntry.find({ userId })
      .select('created_at review')
      .sort({ created_at: -1 })
      .lean()
  ])
  const getDayKey = createDayKeyGetter(timeZone)

  const dayMap = new Map<string, {
    date: string
    entryId: string
    wordCount: number
    hasReview: boolean
  }>()

  for (const entry of visibleEntries) {
    const dayKey = getDayKey(new Date(entry.created_at))

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, {
        date: dayKey,
        entryId: String(entry._id),
        wordCount: entry.word_count,
        hasReview: Boolean(entry.review)
      })
    }
  }

  const allDateKeys = new Set(
    allEntries
      .filter((entry) => Boolean(entry.review))
        .map((entry) => getDayKey(new Date(entry.created_at)))
  )

  return {
    month: {
      year,
      month
    },
    days: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    streak: computeStreak(allDateKeys, timeZone)
  }
})
