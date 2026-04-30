import { beforeEach, describe, expect, it, vi } from 'vitest'

const findMock = vi.fn()
const countDocumentsMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/JournalEntry', () => ({
  JournalEntry: {
    find: findMock,
    countDocuments: countDocumentsMock
  }
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', vi.fn((event: { query?: Record<string, string> }) => event.query ?? {}))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/entries index.get handler', () => {
  it('rejects unauthorized requests', async () => {
    const { default: handler } = await import('../../../server/api/entries/index.get')

    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized'
    })
  })

  it('returns paginated entries with metadata', async () => {
    const leanMock = vi.fn().mockResolvedValue([
      {
        _id: 'entry-1',
        content: 'Primo testo',
        word_count: 2,
        review: undefined,
        created_at: '2026-04-30T00:00:00.000Z',
        updated_at: '2026-04-30T00:00:00.000Z'
      }
    ])
    const limitMock = vi.fn().mockReturnValue({ lean: leanMock })
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })

    findMock.mockReturnValue({ sort: sortMock })
    countDocumentsMock.mockResolvedValue(21)

    const { default: handler } = await import('../../../server/api/entries/index.get')

    const result = await handler({
      context: { userId: 'user-123' },
      query: { page: '2', limit: '10' }
    })

    expect(skipMock).toHaveBeenCalledWith(10)
    expect(limitMock).toHaveBeenCalledWith(10)

    expect(result).toEqual({
      entries: [
        {
          id: 'entry-1',
          content: 'Primo testo',
          word_count: 2,
          review: undefined,
          created_at: '2026-04-30T00:00:00.000Z',
          updated_at: '2026-04-30T00:00:00.000Z'
        }
      ],
      pagination: {
        page: 2,
        limit: 10,
        total: 21,
        totalPages: 3
      }
    })
  })

  it('clamps invalid pagination params', async () => {
    const leanMock = vi.fn().mockResolvedValue([])
    const limitMock = vi.fn().mockReturnValue({ lean: leanMock })
    const skipMock = vi.fn().mockReturnValue({ limit: limitMock })
    const sortMock = vi.fn().mockReturnValue({ skip: skipMock })

    findMock.mockReturnValue({ sort: sortMock })
    countDocumentsMock.mockResolvedValue(0)

    const { default: handler } = await import('../../../server/api/entries/index.get')

    const result = await handler({
      context: { userId: 'user-123' },
      query: { page: '-5', limit: '200' }
    })

    expect(skipMock).toHaveBeenCalledWith(0)
    expect(limitMock).toHaveBeenCalledWith(50)
    expect(result.pagination).toEqual({
      page: 1,
      limit: 50,
      total: 0,
      totalPages: 1
    })
  })
})
