import { User } from '../../../models/User'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  const id = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  if (!id) {
    throw createError({ statusCode: 400, message: 'Tip ID is required' })
  }

  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const initialCount = user.savedTips.length
  user.savedTips = user.savedTips.filter((tip) => tip.tipId !== id)

  if (user.savedTips.length === initialCount) {
    throw createError({ statusCode: 404, message: 'Saved tip not found' })
  }

  await user.save()

  return { success: true }
})
