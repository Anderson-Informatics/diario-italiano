import { JournalEntry } from '../../models/JournalEntry'
import { isValidReview } from '../../utils/review'

function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0
  }
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const id = getRouterParam(event, 'id')
  
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!id) {
    throw createError({ statusCode: 400, message: 'Entry ID is required' })
  }

  const entry = await JournalEntry.findOne({ _id: id, userId })
  
  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  const body = await readBody(event)
  const { content, review } = body

  if (content !== undefined) {
    entry.content = content
    entry.word_count = countWords(content)
  }

  if (review !== undefined) {
    if (!isValidReview(review)) {
      throw createError({ statusCode: 400, message: 'Review payload is invalid' })
    }
    entry.review = review
  }

  await entry.save()

  return {
    id: entry._id,
    content: entry.content,
    word_count: entry.word_count,
    review: entry.review,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  }
})