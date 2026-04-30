import { generateReview, ReviewError } from '../utils/review'

export default defineEventHandler(async (event) => {
  const userId = event.context.userId
  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const text: unknown = body?.text

  const config = useRuntimeConfig()

  try {
    return await generateReview(typeof text === 'string' ? text : '', {
      apiKey: config.openaiApiKey as string,
      model: config.openaiModel as string
    })
  } catch (error) {
    if (error instanceof ReviewError) {
      throw createError({ statusCode: error.statusCode, message: error.message })
    }

    throw createError({ statusCode: 500, message: 'Unexpected review service error' })
  }
})
