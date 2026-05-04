import type { WritingReviewPhase } from '../../app/types/index'
import { generateReview, ReviewError } from '../utils/review'

function isWritingReviewPhase(value: unknown): value is WritingReviewPhase {
  return value === 'A1-A2' || value === 'B1-B2' || value === 'C1-C2'
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const text: unknown = body?.text
  const requestedLearnerPhase: unknown = body?.learnerPhase

  if (requestedLearnerPhase !== undefined && !isWritingReviewPhase(requestedLearnerPhase)) {
    throw createError({ statusCode: 400, message: 'learnerPhase is invalid' })
  }

  const learnerPhase = requestedLearnerPhase

  const config = useRuntimeConfig()

  try {
    return await generateReview(typeof text === 'string' ? text : '', {
      apiKey: config.openaiApiKey as string,
      model: config.openaiModel as string,
      learnerPhase
    })
  } catch (error) {
    if (error instanceof ReviewError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }

    throw createError({ statusCode: 500, message: 'Unexpected review service error' })
  }
})
