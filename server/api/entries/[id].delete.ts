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

  const entry = await JournalEntry.findOneAndDelete({ _id: id, userId })
  
  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  return { success: true }
})