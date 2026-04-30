import mongoose from 'mongoose'

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  const mongoUri = config.mongodbUri?.trim()
  const isProduction = process.env.NODE_ENV === 'production'
  const isLocalMongoUri = /^mongodb:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(mongoUri || '')

  if (!mongoUri) {
    throw new Error(
      isProduction
        ? 'Missing MONGO_URI in production. Set MONGO_URI to your MongoDB Atlas connection string.'
        : 'Missing MongoDB URI. Set MONGO_URI in .env or ensure local MongoDB is running.'
    )
  }

  if (isProduction && isLocalMongoUri) {
    throw new Error(
      'Invalid production MongoDB URI. MONGO_URI points to local MongoDB; provide a MongoDB Atlas URI instead.'
    )
  }

  await mongoose.connect(mongoUri)

  const databaseName = mongoose.connection.db?.databaseName || mongoose.connection.name
  console.info(`[mongo] Connected to database: ${databaseName}`)
})