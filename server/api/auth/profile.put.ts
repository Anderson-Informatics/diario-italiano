import { User } from '../../models/User'
import { isValidTimeZone } from '../../utils/timezone'
import type { WritingReviewPhase } from '../../../app/types/index'

function isWritingReviewPhase(value: unknown): value is WritingReviewPhase {
  return value === 'A1-A2' || value === 'B1-B2' || value === 'C1-C2'
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const timezone = typeof body?.timezone === 'string' ? body.timezone.trim() : undefined
  const useTargetReviewPhase = typeof body?.useTargetReviewPhase === 'boolean' ? body.useTargetReviewPhase : undefined
  const targetReviewPhase = body?.targetReviewPhase

  if (timezone !== undefined && !isValidTimeZone(timezone)) {
    throw createError({ statusCode: 400, message: 'Invalid timezone' })
  }

  if (targetReviewPhase !== undefined && !isWritingReviewPhase(targetReviewPhase)) {
    throw createError({ statusCode: 400, message: 'Invalid target review phase' })
  }

  if (useTargetReviewPhase === true && !isWritingReviewPhase(targetReviewPhase)) {
    throw createError({ statusCode: 400, message: 'Target review phase is required when the preference is enabled' })
  }

  if (timezone === undefined && useTargetReviewPhase === undefined && targetReviewPhase === undefined) {
    throw createError({ statusCode: 400, message: 'No profile changes provided' })
  }

  const updates: Record<string, unknown> = {}
  if (timezone !== undefined) {
    updates.timezone = timezone
  }
  if (useTargetReviewPhase !== undefined) {
    updates.useTargetReviewPhase = useTargetReviewPhase
  }
  if (targetReviewPhase !== undefined) {
    updates.targetReviewPhase = targetReviewPhase
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: updates },
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
      timezone: user.timezone,
      useTargetReviewPhase: user.useTargetReviewPhase,
      targetReviewPhase: user.targetReviewPhase
    }
  }
})
