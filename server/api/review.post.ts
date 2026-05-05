import type { WritingReviewPhase } from '../../app/types/index'
import { generateReview, ReviewError } from '../utils/review'

function isWritingReviewPhase(value: unknown): value is WritingReviewPhase {
  return value === 'A1-A2' || value === 'B1-B2' || value === 'C1-C2'
}

export default defineEventHandler(async (event) => {
  const path = typeof getRequestURL === 'function' ? getRequestURL(event).pathname : '/api/review'
  const method = event.method || 'POST'
  const userId = event.context.userId

  console.info('[review] Request received', {
    method,
    path,
    hasUserId: Boolean(userId)
  })

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const body = await readBody(event)
  const text: unknown = body?.text
  const requestedLearnerPhase: unknown = body?.learnerPhase

  if (requestedLearnerPhase !== undefined && !isWritingReviewPhase(requestedLearnerPhase)) {
    throw createError({ statusCode: 400, statusMessage: 'learnerPhase is invalid' })
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
    const message = error instanceof Error ? error.message : String(error)

    if (error instanceof ReviewError) {
      console.error('[review] ReviewError response', {
        method,
        path,
        userId,
        statusCode: error.statusCode,
        message
      })

      throw createError({
        statusCode: error.statusCode,
        statusMessage: error.message,
        data: { message: error.message }
      })
    }

    console.error('[review] Unexpected review handler error', {
      method,
      path,
      userId,
      message,
      error
    })

    throw createError({
      statusCode: 500,
      statusMessage: 'Unexpected review service error',
      data: { message: 'Unexpected review service error' }
    })
  }
})
