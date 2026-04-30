import { JournalEntry } from '../../models/JournalEntry'

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function computeStreak(dateKeys: Set<string>): number {
  let streak = 0
  const cursor = startOfDayUTC(new Date())

  while (dateKeys.has(toDayKey(cursor))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const now = new Date()

  const rawYear = Number.parseInt(String(query.year ?? now.getUTCFullYear()), 10)
  const rawMonth = Number.parseInt(String(query.month ?? now.getUTCMonth() + 1), 10)

  const year = Number.isNaN(rawYear) ? now.getUTCFullYear() : rawYear
  const month = Number.isNaN(rawMonth) ? now.getUTCMonth() + 1 : rawMonth

  if (month < 1 || month > 12) {
    throw createError({ statusCode: 400, message: 'month must be between 1 and 12' })
  }

  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 1))

  const [monthEntries, allEntries] = await Promise.all([
    JournalEntry.find({
      userId,
      created_at: { $gte: monthStart, $lt: monthEnd }
    })
      .sort({ created_at: -1 })
      .lean(),
    JournalEntry.find({ userId })
      .select('created_at')
      .sort({ created_at: -1 })
      .lean()
  ])

  const dayMap = new Map<string, {
    date: string
    entryId: string
    wordCount: number
    hasReview: boolean
  }>()

  for (const entry of monthEntries) {
    const dayKey = toDayKey(new Date(entry.created_at))

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
    allEntries.map((entry) => toDayKey(new Date(entry.created_at)))
  )

  return {
    month: {
      year,
      month
    },
    days: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
    streak: computeStreak(allDateKeys)
  }
})
