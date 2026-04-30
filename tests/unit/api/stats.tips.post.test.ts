import { beforeEach, describe, expect, it, vi } from 'vitest'

const userFindByIdMock = vi.fn()
const buildTipIdForSaveMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/User', () => ({
  User: {
    findById: userFindByIdMock
  }
}))

vi.mock('../../../server/utils/stats', () => ({
  buildTipIdForSave: buildTipIdForSaveMock
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readBody', vi.fn(async (event: { body?: unknown }) => event.body))
  vi.stubGlobal('createError', createErrorMock)
})

describe('/api/stats/tips index.post handler', () => {
  it('rejects unauthorized requests', async () => {
    const { default: handler } = await import('../../../server/api/stats/tips/index.post')

    await expect(handler({ context: {}, body: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Unauthorized'
    })
  })

  it('saves new tips', async () => {
    buildTipIdForSaveMock.mockReturnValue('tip-hash-1')

    const saveMock = vi.fn().mockResolvedValue(undefined)
    const user = {
      savedTips: [],
      save: saveMock
    }
    userFindByIdMock.mockResolvedValue(user)

    const { default: handler } = await import('../../../server/api/stats/tips/index.post')

    const result = await handler({
      context: { userId: 'user-1' },
      body: {
        tip: 'Use passato prossimo with avere',
        type: 'grammar',
        original: 'io andata',
        corrected: 'io sono andato'
      }
    })

    expect(result).toEqual({ tipId: 'tip-hash-1', saved: true })
    expect(user.savedTips).toHaveLength(1)
    expect(saveMock).toHaveBeenCalled()
  })

  it('returns success when tip is already saved', async () => {
    buildTipIdForSaveMock.mockReturnValue('tip-hash-1')

    const saveMock = vi.fn().mockResolvedValue(undefined)
    const user = {
      savedTips: [{ tipId: 'tip-hash-1', tip: 'Saved tip', type: 'grammar' }],
      save: saveMock
    }
    userFindByIdMock.mockResolvedValue(user)

    const { default: handler } = await import('../../../server/api/stats/tips/index.post')

    const result = await handler({
      context: { userId: 'user-1' },
      body: {
        tip: 'Saved tip',
        type: 'grammar'
      }
    })

    expect(result).toEqual({ tipId: 'tip-hash-1', saved: true })
    expect(saveMock).not.toHaveBeenCalled()
  })
})
