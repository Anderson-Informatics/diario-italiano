import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { JournalEntry } from '../../../server/models/JournalEntry'
import { User } from '../../../server/models/User'

let mongoServer: MongoMemoryServer
let testUserId: mongoose.Types.ObjectId

describe('Entry API Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: 'wiredTiger'
      }
    })
    const mongoUri = mongoServer.getUri()
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    
    await mongoose.connect(mongoUri)
    
    // Create a test user for entry association
    const user = await User.create({
      username: 'entryuser',
      email: 'entry@example.com',
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

  describe('JournalEntry Model', () => {
    it('should create an entry with correct word count', async () => {
      const entryData = {
        userId: testUserId,
        content: 'Questo è un test in italiano con cinque parole.'
      }

      const entry = new JournalEntry(entryData)
      await entry.save()

      expect(entry._id).toBeDefined()
      expect(entry.word_count).toBe(9)
      expect(entry.content).toBe(entryData.content)
    })

    it('should handle empty content with zero word count', async () => {
      const entry = new JournalEntry({
        userId: testUserId,
        content: ''
      })
      await entry.save()

      expect(entry.word_count).toBe(0)
    })

    it('should handle content with extra whitespace', async () => {
      const entry = new JournalEntry({
        userId: testUserId,
        content: '  Una   doppia   spaziatura    qui  '
      })
      await entry.save()

      expect(entry.word_count).toBe(4)
    })

    it('should update word count when content changes', async () => {
      const entry = await JournalEntry.create({
        userId: testUserId,
        content: 'Parole iniziali'
      })

      expect(entry.word_count).toBe(2)

      entry.content = 'Molte più parole nel contenuto aggiornato'
      await entry.save()

      expect(entry.word_count).toBe(6)
    })
  })

  describe('Entry CRUD Operations', () => {
    it('should create entry with timestamp', async () => {
      const entry = await JournalEntry.create({
        userId: testUserId,
        content: 'Nuovo entry di test'
      })

      expect(entry.created_at).toBeDefined()
      expect(entry.updated_at).toBeDefined()
      expect(entry.created_at).toBeInstanceOf(Date)
    })

    it('should find entries by user', async () => {
      await JournalEntry.create([
        { userId: testUserId, content: 'Primo entry' },
        { userId: testUserId, content: 'Secondo entry' }
      ])

      const entries = await JournalEntry.find({ userId: testUserId })
      expect(entries).toHaveLength(2)
    })

    it('should find single entry by id', async () => {
      const entry = await JournalEntry.create({
        userId: testUserId,
        content: 'Entry unico'
      })

      const found = await JournalEntry.findById(entry._id)
      expect(found).toBeDefined()
      expect(found?.content).toBe('Entry unico')
    })

    it('should update an entry', async () => {
      const entry = await JournalEntry.create({
        userId: testUserId,
        content: 'Contenuto originale'
      })

      entry.content = 'Contenuto modificato'
      await entry.save()

      const updated = await JournalEntry.findById(entry._id)
      expect(updated?.content).toBe('Contenuto modificato')
    })

    it('should delete an entry', async () => {
      const entry = await JournalEntry.create({
        userId: testUserId,
        content: 'Da cancellare'
      })

      await JournalEntry.findByIdAndDelete(entry._id)

      const deleted = await JournalEntry.findById(entry._id)
      expect(deleted).toBeNull()
    })
  })
})