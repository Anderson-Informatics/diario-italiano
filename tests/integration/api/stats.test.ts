import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach, vi } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { JournalEntry } from '../../../server/models/JournalEntry'
import { User } from '../../../server/models/User'
import { buildTipIdForSave, getDashboardStats } from '../../../server/utils/stats'

let mongoServer: MongoMemoryServer
let testUserId: mongoose.Types.ObjectId
const FIXED_NOW = new Date('2026-05-04T12:00:00.000Z')

describe('Stats aggregation integration tests', () => {
  function getUtcNoonWithDayOffset(offsetDays: number): Date {
    const now = new Date()
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0))
    date.setUTCDate(date.getUTCDate() + offsetDays)
    return date
  }

  async function setEntryCreatedAt(entryId: mongoose.Types.ObjectId, createdAt: Date) {
    await JournalEntry.collection.updateOne({ _id: entryId }, { $set: { created_at: createdAt } })
  }

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
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
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
    // Rate fields — 4 errors across entries; word counts set by pre-save hook
    expect(stats.summary.averageErrorRate).toBeGreaterThan(0)
    expect(typeof stats.summary.averageErrorRate).toBe('number')
    expect(stats.errorDistribution.grammarRate).toBeGreaterThan(0)
    expect(stats.errorDistribution.grammarRate).toBeLessThanOrEqual(stats.errorDistribution.averageRate)
    expect(stats.errorDistribution.spellingRate).toBe(0)
    expect(stats.errorDistribution.vocabularyRate).toBeGreaterThan(0)
    expect(stats.errorDistribution.averageRate).toBe(stats.summary.averageErrorRate)
    // Trend rows should each carry an error_rate
    if (stats.errorTrend.length > 0) {
      expect(typeof stats.errorTrend[0].error_rate).toBe('number')
      expect(stats.errorTrend[0].error_rate).toBeGreaterThanOrEqual(0)
    }
    expect(stats.tips.some((tip) => tip.tip === tipText && tip.isSaved)).toBe(true)
    expect(stats.savedTips).toHaveLength(1)
  })

  it('returns punctuation focus recommendations for punctuation-only reviewed entries', async () => {
    await JournalEntry.create([
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
          stats: {
            total_errors: 1,
            grammar: 0,
            spelling: 0,
            vocabulary: 0,
            punctuation: 1
          },
          cefrLevel: {
            estimated: 'A2',
            confidence: 79,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Ciao!Come va?',
        review: {
          corrected_text: 'Ciao! Come va?',
          corrections: [
            {
              original: '!Come',
              corrected: '! Come',
              type: 'punctuation',
              tip: 'Add a space after punctuation when needed.'
            }
          ],
          stats: {
            total_errors: 1,
            grammar: 0,
            spelling: 0,
            vocabulary: 0,
            punctuation: 1
          },
          cefrLevel: {
            estimated: 'A2',
            confidence: 79,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Bene,grazie.',
        review: {
          corrected_text: 'Bene, grazie.',
          corrections: [
            {
              original: 'Bene,grazie',
              corrected: 'Bene, grazie',
              type: 'punctuation',
              tip: 'Use a space after commas.'
            }
          ],
          stats: {
            total_errors: 1,
            grammar: 0,
            spelling: 0,
            vocabulary: 0,
            punctuation: 1
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
    expect(stats.focusRecommendations.some((recommendation) => recommendation.area === 'Punctuation and spacing')).toBe(true)
  })

  it('counts today in current streak only when today entry is complete', async () => {
    const [todayEntry, yesterdayEntry] = await JournalEntry.create([
      {
        userId: testUserId,
        content: 'Today complete',
        review: {
          corrected_text: 'Today complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Yesterday complete',
        review: {
          corrected_text: 'Yesterday complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      }
    ])

    await setEntryCreatedAt(todayEntry._id, getUtcNoonWithDayOffset(0))
    await setEntryCreatedAt(yesterdayEntry._id, getUtcNoonWithDayOffset(-1))

    const user = await User.findById(testUserId).select('savedTips').lean()
    const stats = await getDashboardStats(String(testUserId), 'all', user?.savedTips ?? [], 'UTC')

    expect(stats.summary.currentStreak).toBe(2)
  })

  it('starts streak from yesterday when today entry is incomplete', async () => {
    const [todayIncompleteEntry, yesterdayCompleteEntry, twoDaysAgoCompleteEntry] = await JournalEntry.create([
      {
        userId: testUserId,
        content: 'Today incomplete'
      },
      {
        userId: testUserId,
        content: 'Yesterday complete',
        review: {
          corrected_text: 'Yesterday complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Two days ago complete',
        review: {
          corrected_text: 'Two days ago complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      }
    ])

    await setEntryCreatedAt(todayIncompleteEntry._id, getUtcNoonWithDayOffset(0))
    await setEntryCreatedAt(yesterdayCompleteEntry._id, getUtcNoonWithDayOffset(-1))
    await setEntryCreatedAt(twoDaysAgoCompleteEntry._id, getUtcNoonWithDayOffset(-2))

    const user = await User.findById(testUserId).select('savedTips').lean()
    const stats = await getDashboardStats(String(testUserId), 'all', user?.savedTips ?? [], 'UTC')

    expect(stats.summary.currentStreak).toBe(2)
  })

  it('starts streak from yesterday when there is no entry today', async () => {
    const [yesterdayCompleteEntry, twoDaysAgoCompleteEntry] = await JournalEntry.create([
      {
        userId: testUserId,
        content: 'Yesterday complete',
        review: {
          corrected_text: 'Yesterday complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      },
      {
        userId: testUserId,
        content: 'Two days ago complete',
        review: {
          corrected_text: 'Two days ago complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      }
    ])

    await setEntryCreatedAt(yesterdayCompleteEntry._id, getUtcNoonWithDayOffset(-1))
    await setEntryCreatedAt(twoDaysAgoCompleteEntry._id, getUtcNoonWithDayOffset(-2))

    const user = await User.findById(testUserId).select('savedTips').lean()
    const stats = await getDashboardStats(String(testUserId), 'all', user?.savedTips ?? [], 'UTC')

    expect(stats.summary.currentStreak).toBe(2)
  })

  it('returns zero when yesterday has no complete entry', async () => {
    const [todayIncompleteEntry, twoDaysAgoCompleteEntry] = await JournalEntry.create([
      {
        userId: testUserId,
        content: 'Today incomplete'
      },
      {
        userId: testUserId,
        content: 'Two days ago complete',
        review: {
          corrected_text: 'Two days ago complete',
          corrections: [],
          stats: {
            total_errors: 0,
            grammar: 0,
            spelling: 0,
            vocabulary: 0
          },
          cefrLevel: {
            estimated: 'A1',
            confidence: 80,
            recommendations: []
          }
        }
      }
    ])

    await setEntryCreatedAt(todayIncompleteEntry._id, getUtcNoonWithDayOffset(0))
    await setEntryCreatedAt(twoDaysAgoCompleteEntry._id, getUtcNoonWithDayOffset(-2))

    const user = await User.findById(testUserId).select('savedTips').lean()
    const stats = await getDashboardStats(String(testUserId), 'all', user?.savedTips ?? [], 'UTC')

    expect(stats.summary.currentStreak).toBe(0)
  })
})
