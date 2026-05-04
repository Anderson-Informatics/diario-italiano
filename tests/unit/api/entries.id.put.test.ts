import { beforeEach, describe, expect, it, vi } from 'vitest'

const findOneMock = vi.fn()
const isValidReviewMock = vi.fn()
const normalizeReviewForCompatibilityMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/JournalEntry', () => ({
  JournalEntry: {
    findOne: findOneMock
  }
}))

vi.mock('../../../server/utils/review', () => ({
  isValidReview: isValidReviewMock,
  normalizeReviewForCompatibility: normalizeReviewForCompatibilityMock
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getRouterParam', vi.fn((event: { params?: Record<string, string> }, name: string) => event.params?.[name]))
  vi.stubGlobal('readBody', vi.fn(async (event: { body?: unknown }) => event.body))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/entries/[id] put handler', () => {
  it('persists enriched review payloads and returns them', async () => {
    const saveMock = vi.fn().mockResolvedValue(undefined)
    const entry = {
      _id: 'entry-123',
      userId: 'user-123',
      content: 'Ho mangiata una mela.',
      word_count: 4,
      review: undefined,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z',
      save: saveMock
    }
    const enrichedReview = {
      corrected_text: 'Ho mangiato una mela.',
      corrections: [
        {
          original: 'mangiata',
          corrected: 'mangiato',
          type: 'grammar',
          tip: 'Use the past participle mangiato after ho.',
          tags: ['past participle']
        }
      ],
      stats: { total_errors: 1, grammar: 1, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'A2', confidence: 84, recommendations: [] },
      writing: {
        phase: 'A1-A2',
        strengths: ['The sentence is easy to understand.', 'You communicated one clear idea.'],
        priorities: [
          {
            title: 'Past participles',
            detail: 'Use mangiato after ho.'
          }
        ],
        dimensionScores: [
          {
            dimension: 'grammarControl',
            score: 3,
            rationale: 'The idea is clear, but the verb form needs correction.'
          }
        ],
        modelRewrite: 'Ho mangiato una mela.',
        followUpTask: {
          prompt: 'Write two more sentences about what you ate yesterday.',
          instructions: 'Use ho + past participle in both.'
        }
      }
    }

    findOneMock.mockResolvedValue(entry)
    isValidReviewMock.mockReturnValue(true)
    normalizeReviewForCompatibilityMock.mockReturnValue(enrichedReview)

    const { default: handler } = await import('../../../server/api/entries/[id].put')
    const result = await handler({
      context: { userId: 'user-123' },
      params: { id: 'entry-123' },
      body: { review: enrichedReview }
    })

    expect(isValidReviewMock).toHaveBeenCalledWith(enrichedReview)
    expect(normalizeReviewForCompatibilityMock).toHaveBeenCalledWith(enrichedReview)
    expect(entry.review).toEqual(enrichedReview)
    expect(saveMock).toHaveBeenCalledOnce()
    expect(result).toEqual({
      id: 'entry-123',
      content: 'Ho mangiata una mela.',
      word_count: 4,
      review: enrichedReview,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z'
    })
  })

  it('rejects invalid enriched review payloads', async () => {
    findOneMock.mockResolvedValue({
      save: vi.fn(),
      content: 'Ciao',
      word_count: 1,
      created_at: '2026-05-02T00:00:00.000Z',
      updated_at: '2026-05-02T00:00:00.000Z'
    })
    isValidReviewMock.mockReturnValue(false)

    const { default: handler } = await import('../../../server/api/entries/[id].put')

    await expect(
      handler({
        context: { userId: 'user-123' },
        params: { id: 'entry-123' },
        body: { review: { writing: { phase: 'A1-A2' } } }
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Review payload is invalid'
    })
  })
})