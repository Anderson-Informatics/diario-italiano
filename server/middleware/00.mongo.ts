import { ensureMongoConnection } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const method = event.method

  if (!path.startsWith('/api/')) {
    return
  }

  try {
    await ensureMongoConnection()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[mongo] Request blocked due to MongoDB connection error', {
      method,
      path,
      message,
      error
    })

    throw createError({
      statusCode: 503,
      statusMessage: 'Database unavailable',
      data: {
        message
      }
    })
  }
})