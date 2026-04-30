import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { JournalEntry } from '../../../server/models/JournalEntry'
import { User } from '../../../server/models/User'

let mongoServer: MongoMemoryServer
let testUserId: mongoose.Types.ObjectId

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', vi.fn((event: { query?: Record<string, string> }) => event.query ?? {}))
  vi.stubGlobal('createError', (input: { statusCode: number; message: string }) =>
    Object.assign(new Error(input.message), input)
  )
})

describe('Entries dates endpoint integration', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: 'wiredTiger'
      }
    })

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }

    await mongoose.connect(mongoServer.getUri())

    const user = await User.create({
      username: 'calendaruser',
      email: 'calendar@example.com',
      password: 'password123'
    })

    testUserId = user._id
  })

  afterEach(async () => {
    await JournalEntry.deleteMany({})
  })

  afterAll(async () => {
    await JournalEntry.deleteMany({})
    await User.deleteMany({})

    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  it('returns month day metadata and streak', async () => {
    const now = new Date()
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
    const yesterdayUtc = new Date(todayUtc)
    yesterdayUtc.setUTCDate(yesterdayUtc.getUTCDate() - 1)

    const [todayEntry, yesterdayEntry] = await JournalEntry.create([
      { userId: testUserId, content: 'Today entry' },
      { userId: testUserId, content: 'Yesterday entry' }
    ])

    await JournalEntry.collection.updateOne(
      { _id: todayEntry._id },
      { $set: { created_at: todayUtc } },
    )
    await JournalEntry.collection.updateOne(
      { _id: yesterdayEntry._id },
      { $set: { created_at: yesterdayUtc } },
    )

    const { default: handler } = await import('../../../server/api/entries/dates.get')

    const result = await handler({
      context: { userId: String(testUserId) },
      query: {
        year: String(now.getUTCFullYear()),
        month: String(now.getUTCMonth() + 1),
      }
    })

    expect(result.month).toEqual({
      year: now.getUTCFullYear(),
      month: now.getUTCMonth() + 1,
    })
    expect(
      result.days.some((day: { entryId: string }) => day.entryId === String(todayEntry._id)),
    ).toBe(true)
    expect(result.streak).toBe(2)
  })
})
