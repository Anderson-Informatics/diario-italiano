import { ensureMongoConnection } from '../utils/mongo'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  if (!path.startsWith('/api/')) {
    return
  }

  await ensureMongoConnection()
})