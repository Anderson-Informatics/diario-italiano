import { JournalEntry } from '../../models/JournalEntry'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const parsedPage = Number.parseInt(String(query.page ?? '1'), 10)
  const parsedLimit = Number.parseInt(String(query.limit ?? '10'), 10)

  const page = Number.isNaN(parsedPage) ? 1 : Math.max(parsedPage, 1)
  const limit = Number.isNaN(parsedLimit) ? 10 : Math.min(Math.max(parsedLimit, 1), 50)
  const skip = (page - 1) * limit

  const [entries, total] = await Promise.all([
    JournalEntry.find({ userId })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    JournalEntry.countDocuments({ userId })
  ])

  return {
    entries: entries.map(entry => ({
      id: entry._id,
      content: entry.content,
      word_count: entry.word_count,
      review: entry.review,
      created_at: entry.created_at,
      updated_at: entry.updated_at
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  }
})