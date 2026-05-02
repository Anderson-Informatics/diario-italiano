import { User } from '../../models/User'
import { isValidTimeZone } from '../../utils/timezone'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : ''

  if (!isValidTimeZone(timezone)) {
    throw createError({ statusCode: 400, message: 'Invalid timezone' })
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { timezone } },
    { new: true }
  ).select('-password')

  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    user: {
      id: String(user._id),
      username: user.username,
      email: user.email,
      timezone: user.timezone
    }
  }
})
