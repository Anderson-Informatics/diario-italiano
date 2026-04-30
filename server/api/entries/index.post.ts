import { JournalEntry } from '../../models/JournalEntry'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { content } = body

  if (!content || content.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'Content is required' })
  }

  const entry = await JournalEntry.create({
    userId,
    content
  })

  return {
    id: entry._id,
    content: entry.content,
    word_count: entry.word_count,
    review: entry.review,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  }
})