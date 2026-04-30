import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/JournalEntry', () => ({
  JournalEntry: {
    find: findMock
  }
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', vi.fn((event: { query?: Record<string, string> }) => event.query ?? {}))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/entries/dates handler', () => {
  it('rejects unauthorized requests', async () => {
    const { default: handler } = await import('../../../server/api/entries/dates.get')

    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized'
    })
  })

  it('rejects invalid month values', async () => {
    const { default: handler } = await import('../../../server/api/entries/dates.get')

    await expect(
      handler({ context: { userId: 'user-1' }, query: { year: '2026', month: '13' } })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'month must be between 1 and 12'
    })
  })

  it('returns grouped day metadata with streak', async () => {
    const monthLeanMock = vi.fn().mockResolvedValue([
      {
        _id: 'entry-late',
        created_at: '2026-04-10T15:00:00.000Z',
        word_count: 40,
        review: { corrected_text: 'x' }
      },
      {
        _id: 'entry-early',
        created_at: '2026-04-10T10:00:00.000Z',
        word_count: 20,
        review: undefined
      },
      {
        _id: 'entry-next',
        created_at: '2026-04-11T10:00:00.000Z',
        word_count: 12,
        review: undefined
      }
    ])

    const allLeanMock = vi.fn().mockResolvedValue([
      { created_at: new Date().toISOString() },
      { created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() }
    ])

    const monthSortMock = vi.fn().mockReturnValue({ lean: monthLeanMock })
    const allSortMock = vi.fn().mockReturnValue({ lean: allLeanMock })
    const allSelectMock = vi.fn().mockReturnValue({ sort: allSortMock })

    findMock
      .mockReturnValueOnce({ sort: monthSortMock })
      .mockReturnValueOnce({ select: allSelectMock })

    const { default: handler } = await import('../../../server/api/entries/dates.get')

    const result = await handler({
      context: { userId: 'user-1' },
      query: { year: '2026', month: '4' }
    })

    expect(result.month).toEqual({ year: 2026, month: 4 })
    expect(result.days).toEqual([
      {
        date: '2026-04-10',
        entryId: 'entry-late',
        wordCount: 40,
        hasReview: true
      },
      {
        date: '2026-04-11',
        entryId: 'entry-next',
        wordCount: 12,
        hasReview: false
      }
    ])
    expect(result.streak).toBeGreaterThanOrEqual(1)
  })
})
