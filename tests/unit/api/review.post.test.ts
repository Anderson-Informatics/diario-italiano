import { beforeEach, describe, expect, it, vi } from 'vitest'

const generateReviewMock = vi.fn()

vi.mock('../../../server/utils/review', () => {
  class ReviewError extends Error {
    statusCode: number

    constructor(statusCode: number, message: string) {
      super(message)
      this.statusCode = statusCode
    }
  }

  return {
    ReviewError,
    generateReview: generateReviewMock
  }
})

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readBody', vi.fn(async (event: { body?: unknown }) => event.body))
  vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({ openaiApiKey: 'test-key', openaiModel: 'gpt-4o-mini' })))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/review handler', () => {
  it('rejects unauthorized requests', async () => {
    const { default: handler } = await import('../../../server/api/review.post')

    await expect(handler({ context: {}, body: { text: 'Ciao' } })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized'
    })
  })

  it('returns generated review for authenticated requests', async () => {
    const review = {
      corrected_text: 'Ciao',
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'A1', confidence: 90, recommendations: [] }
    }
    generateReviewMock.mockResolvedValue(review)

    const { default: handler } = await import('../../../server/api/review.post')
    const result = await handler({ context: { userId: '123' }, body: { text: 'Ciao' } })

    expect(result).toEqual(review)
    expect(generateReviewMock).toHaveBeenCalledWith('Ciao', {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      learnerPhase: undefined
    })
  })

  it('passes learner phase through when provided', async () => {
    const review = {
      corrected_text: 'Ciao',
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'A1', confidence: 90, recommendations: [] }
    }
    generateReviewMock.mockResolvedValue(review)

    const { default: handler } = await import('../../../server/api/review.post')
    await handler({ context: { userId: '123' }, body: { text: 'Ciao', learnerPhase: 'B1-B2' } })

    expect(generateReviewMock).toHaveBeenCalledWith('Ciao', {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      learnerPhase: 'B1-B2'
    })
  })

  it('maps ReviewError to h3 errors', async () => {
    const { ReviewError } = await import('../../../server/utils/review')
    generateReviewMock.mockRejectedValue(new ReviewError(503, 'AI review service is unavailable'))

    const { default: handler } = await import('../../../server/api/review.post')

    await expect(handler({ context: { userId: '123' }, body: { text: 'Ciao' } })).rejects.toMatchObject({
      statusCode: 503,
      message: 'AI review service is unavailable'
    })
  })
})