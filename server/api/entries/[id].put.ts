import { JournalEntry } from '../../models/JournalEntry'

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
  const { content } = body

  if (content !== undefined) {
    entry.content = content
    await entry.save()
  }

  return {
    id: entry._id,
    content: entry.content,
    word_count: entry.word_count,
    created_at: entry.created_at,
    updated_at: entry.updated_at
  }
})