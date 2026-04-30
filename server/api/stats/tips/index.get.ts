import { User } from '../../../models/User'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const user = await User.findById(userId).select('savedTips').lean()
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const savedTips = Array.isArray(user.savedTips) ? user.savedTips : []

  return {
    savedTips: savedTips.map((tip) => ({
      ...tip,
      savedAt: tip.savedAt.toISOString()
    }))
  }
})
