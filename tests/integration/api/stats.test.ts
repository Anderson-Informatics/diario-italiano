import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { JournalEntry } from '../../../server/models/JournalEntry'
import { User } from '../../../server/models/User'
import { buildTipIdForSave, getDashboardStats } from '../../../server/utils/stats'

let mongoServer: MongoMemoryServer
let testUserId: mongoose.Types.ObjectId

describe('Stats aggregation integration tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: { storageEngine: 'wiredTiger' }
    })

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }

    await mongoose.connect(mongoServer.getUri())

    const savedTipText = 'Use passato prossimo with avere for transitive verbs.'
    const tipId = buildTipIdForSave({
      tip: savedTipText,
      type: 'grammar',
      original: 'ho andata',
      corrected: 'sono andato'
    })

    const user = await User.create({
      username: 'statsuser',
      email: 'stats@example.com',
      password: 'password123',
      savedTips: [
        {
          tipId,
          tip: savedTipText,
          type: 'grammar',
          original: 'ho andata',
          corrected: 'sono andato',
          savedAt: new Date()
        }
      ]
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

  it('aggregates stats and marks saved tips', async () => {
    const tipText = 'Use passato prossimo with avere for transitive verbs.'

    await JournalEntry.create([
      {
        userId: testUserId,
        content: 'Ieri ho andata al mercato',
        review: {
          corrected_text: 'Ieri sono andato al mercato',
          corrections: [
            {
              original: 'ho andata',
              corrected: 'sono andato',
              type: 'grammar',
              tip: tipText
            }
          ],
          stats: {
            total_errors: 1,
            grammar: 1,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A2',
            confidence: 74,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Oggi io mangiato pane',
        review: {
          corrected_text: 'Oggi ho mangiato pane',
          corrections: [
            {
              original: 'io mangiato',
              corrected: 'ho mangiato',
              type: 'grammar',
              tip: 'Add the auxiliary before past participle.'
            }
          ],
          stats: {
            total_errors: 1,
            grammar: 1,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A2',
            confidence: 76,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Domani mangio con amici',
        review: {
          corrected_text: 'Domani mangio con gli amici',
          corrections: [
            {
              original: 'con amici',
              corrected: 'con gli amici',
              type: 'vocabulary',
              tip: 'Use the article before plural nouns in this context.'
            }
          ],
          stats: {
            total_errors: 1,
            grammar: 0,
            spelling: 0,
            vocabulary: 1
          },
          cefrLevel: {
            estimated: 'B1',
            confidence: 80,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Ciao,come stai?',
        review: {
          corrected_text: 'Ciao, come stai?',
          corrections: [
            {
              original: 'Ciao,come',
              corrected: 'Ciao, come',
              type: 'punctuation',
              tip: 'Add a space after commas.'
            }
          ],
          // Legacy stats payload intentionally omits punctuation to verify compatibility normalization.
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A2',
            confidence: 79,
            recommendations: []
          }
        }
      }
    ])

    const user = await User.findById(testUserId).select('savedTips').lean()
    const stats = await getDashboardStats(String(testUserId), 'all', user?.savedTips ?? [], 'UTC')

    expect(stats.hasEnoughData).toBe(true)
    expect(stats.summary.entriesWritten).toBe(4)
    expect(stats.errorDistribution.grammar).toBe(2)
    expect(stats.errorDistribution.vocabulary).toBe(1)
    expect(stats.errorDistribution.punctuation).toBe(1)
    expect(stats.errorDistribution.total).toBe(4)
    expect(stats.tips.some((tip) => tip.tip === tipText && tip.isSaved)).toBe(true)
    expect(stats.savedTips).toHaveLength(1)
  })
})
