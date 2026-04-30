import { User } from '../../models/User'
import { getDashboardStats, type StatsRange } from '../../utils/stats'

function parseRange(rawRange: string | undefined): StatsRange {
  if (rawRange === 'week' || rawRange === 'month' || rawRange === 'all') {
    return rawRange
  }

  return 'month'
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const range = parseRange(typeof query.range === 'string' ? query.range : undefined)

  const user = await User.findById(userId).select('savedTips').lean()
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const savedTips = Array.isArray(user.savedTips) ? user.savedTips : []
  return getDashboardStats(userId, range, savedTips)
})
