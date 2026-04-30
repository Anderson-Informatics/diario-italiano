import mongoose from 'mongoose'

let connectionPromise: Promise<typeof mongoose> | null = null

mongoose.set('bufferCommands', false)

function describeMongoTarget(mongoUri: string) {
  try {
    const { host, pathname } = new URL(mongoUri)
    const databaseName = pathname.replace(/^\//, '') || '(default)'

    return `${host}/${databaseName}`
  }
  catch {
    return 'unparseable MongoDB URI'
  }
}

function getMongoUri() {
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

  return mongoUri
}

export async function ensureMongoConnection() {
  const mongoUri = getMongoUri()

  if (mongoose.connection.readyState === 1) {
    return mongoose
  }

  if (connectionPromise) {
    return connectionPromise
  }

  connectionPromise = mongoose
    .connect(mongoUri, {
      serverSelectionTimeoutMS: 10000
    })
    .then((connection) => {
      const databaseName = connection.connection.db?.databaseName || connection.connection.name
      console.info(`[mongo] Connected to database: ${databaseName}`)

      return connection
    })
    .catch((error: unknown) => {
      connectionPromise = null

      const reason = error instanceof Error ? error.message : 'Unknown MongoDB connection error'
      throw new Error(
        `Failed to connect to MongoDB at ${describeMongoTarget(mongoUri)}. ${reason}`
      )
    })

  return connectionPromise
}