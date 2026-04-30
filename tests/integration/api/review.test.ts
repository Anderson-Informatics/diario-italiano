import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { JournalEntry } from '../../../server/models/JournalEntry'
import { User } from '../../../server/models/User'

let mongoServer: MongoMemoryServer
let testUserId: mongoose.Types.ObjectId

const mockReviewData = {
  corrected_text: 'Ho mangiato una mela oggi.',
  corrections: [
    {
      original: 'mangiata',
      corrected: 'mangiato',
      type: 'grammar' as const,
      tip: 'Past participle with avere does not agree with the object.',
      reference_link: 'https://example.com/grammar'
    },
    {
      original: 'pommo',
      corrected: 'mela',
      type: 'vocabulary' as const,
      tip: 'The Italian word for apple is "mela".'
    }
  ],
  stats: {
    total_errors: 2,
    grammar: 1,
    spelling: 0,
    vocabulary: 1
  },
  cefrLevel: {
    estimated: 'A2',
    confidence: 80,
    recommendations: [
      {
        area: 'Passato prossimo',
        suggestion: 'Practice with auxiliary avere vs essere.',
        examples: ['Ho mangiato.', 'Sono andato.']
      }
    ]
  }
}

describe('JournalEntry Review Field Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: { storageEngine: 'wiredTiger' }
    })
    const mongoUri = mongoServer.getUri()

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }

    await mongoose.connect(mongoUri)

    const user = await User.create({
      username: 'reviewuser',
      email: 'review@example.com',
      password: 'password123'
    })
    testUserId = user._id
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  afterEach(async () => {
    await JournalEntry.deleteMany({})
  })

  it('should create an entry without a review field', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Testo senza revisione.' })
    expect(entry.review).toBeUndefined()
  })

  it('should save and retrieve a review on an entry', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Ho mangiata una pommo oggi.' })
    entry.review = mockReviewData
    await entry.save()

    const saved = await JournalEntry.findById(entry._id)
    expect(saved?.review).toBeDefined()
    expect(saved?.review?.corrected_text).toBe('Ho mangiato una mela oggi.')
    expect(saved?.review?.stats.total_errors).toBe(2)
    expect(saved?.review?.stats.grammar).toBe(1)
    expect(saved?.review?.stats.vocabulary).toBe(1)
  })

  it('should persist all correction fields including reference_link', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Ho mangiata una pommo oggi.' })
    entry.review = mockReviewData
    await entry.save()

    const saved = await JournalEntry.findById(entry._id)
    const grammarCorrection = saved?.review?.corrections.find(c => c.type === 'grammar')

    expect(grammarCorrection?.original).toBe('mangiata')
    expect(grammarCorrection?.corrected).toBe('mangiato')
    expect(grammarCorrection?.tip).toBeDefined()
    expect(grammarCorrection?.reference_link).toBe('https://example.com/grammar')
  })

  it('should persist CEFR level data', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Testo di prova.' })
    entry.review = mockReviewData
    await entry.save()

    const saved = await JournalEntry.findById(entry._id)
    expect(saved?.review?.cefrLevel.estimated).toBe('A2')
    expect(saved?.review?.cefrLevel.confidence).toBe(80)
    expect(saved?.review?.cefrLevel.recommendations).toHaveLength(1)
    expect(saved?.review?.cefrLevel.recommendations[0].area).toBe('Passato prossimo')
  })

  it('should persist an entry with no corrections (perfect text)', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Ho mangiato una mela.' })
    entry.review = {
      corrected_text: 'Ho mangiato una mela.',
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'B1', confidence: 90, recommendations: [] }
    }
    await entry.save()

    const saved = await JournalEntry.findById(entry._id)
    expect(saved?.review?.corrections).toHaveLength(0)
    expect(saved?.review?.stats.total_errors).toBe(0)
  })

  it('should allow updating a review after it was set', async () => {
    const entry = await JournalEntry.create({ userId: testUserId, content: 'Testo iniziale.' })
    entry.review = mockReviewData
    await entry.save()

    const found = await JournalEntry.findById(entry._id)
    found!.review = {
      ...mockReviewData,
      corrected_text: 'Testo aggiornato.',
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      corrections: []
    }
    await found!.save()

    const updated = await JournalEntry.findById(entry._id)
    expect(updated?.review?.corrected_text).toBe('Testo aggiornato.')
    expect(updated?.review?.corrections).toHaveLength(0)
  })
})
