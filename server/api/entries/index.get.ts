import { JournalEntry } from '../../models/JournalEntry'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const entries = await JournalEntry.find({ userId })
    .sort({ created_at: -1 })
    .select('-userId')
    .lean()

  return entries
})