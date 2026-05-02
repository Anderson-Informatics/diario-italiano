import { beforeEach, describe, expect, it, vi } from 'vitest'

const findByIdMock = vi.fn()
const getDashboardStatsMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/User', () => ({
  User: {
    findById: findByIdMock
  }
}))

vi.mock('../../../server/utils/stats', () => ({
  getDashboardStats: getDashboardStatsMock
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('getQuery', vi.fn((event: { query?: Record<string, string> }) => event.query ?? {}))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/stats/dashboard handler', () => {
  it('rejects unauthorized requests', async () => {
    const { default: handler } = await import('../../../server/api/stats/dashboard.get')

    await expect(handler({ context: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized'
    })
  })

  it('returns dashboard stats for authenticated users', async () => {
    const selectMock = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ savedTips: [{ tipId: 'tip-1' }], timezone: 'Europe/Rome' })
    })
    findByIdMock.mockReturnValue({ select: selectMock })

    getDashboardStatsMock.mockResolvedValue({
      range: 'month',
      summary: { entriesWritten: 3 }
    })

    const { default: handler } = await import('../../../server/api/stats/dashboard.get')

    const result = await handler({
      context: { userId: 'user-123' },
      query: { range: 'month' }
    })

    expect(getDashboardStatsMock).toHaveBeenCalledWith('user-123', 'month', [{ tipId: 'tip-1' }], 'Europe/Rome')
    expect(result).toEqual({
      range: 'month',
      summary: { entriesWritten: 3 }
    })
  })

  it('defaults unknown range to month', async () => {
    const selectMock = vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue({ savedTips: [], timezone: 'UTC' })
    })
    findByIdMock.mockReturnValue({ select: selectMock })
    getDashboardStatsMock.mockResolvedValue({ ok: true })

    const { default: handler } = await import('../../../server/api/stats/dashboard.get')

    await handler({
      context: { userId: 'user-123' },
      query: { range: 'quarter' }
    })

    expect(getDashboardStatsMock).toHaveBeenCalledWith('user-123', 'month', [], 'UTC')
  })
})
