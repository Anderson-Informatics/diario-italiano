import { beforeEach, describe, expect, it, vi } from 'vitest'

const findOneMock = vi.fn()
const createMock = vi.fn()
const findByIdMock = vi.fn()

const signMock = vi.fn()
const verifyMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/User', () => ({
  User: {
    findOne: findOneMock,
    create: createMock,
    findById: findByIdMock
  }
}))

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: signMock,
    verify: verifyMock
  }
}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()

  vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
  vi.stubGlobal('readBody', vi.fn(async (event: { body?: unknown }) => event.body))
  vi.stubGlobal('getRequestHeader', vi.fn((event: { headers?: Record<string, string> }, name: string) => {
    return event.headers?.[name] ?? event.headers?.[name.toLowerCase()]
  }))
  vi.stubGlobal('getRequestURL', vi.fn((event: { path?: string }) => ({ pathname: event.path ?? '/' })))
  vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({ jwtSecret: 'test-secret' })))
  vi.stubGlobal('createError', createErrorMock)
})

describe('Auth Handlers', () => {
  describe('/api/auth/register', () => {
    it('rejects missing required fields', async () => {
      const { default: handler } = await import('../../../server/api/auth/register.post')

      await expect(handler({ body: { username: 'u1' } })).rejects.toMatchObject({
        statusCode: 400,
        message: 'All fields required'
      })
    })

    it('rejects duplicate username/email', async () => {
      findOneMock.mockResolvedValue({ _id: 'existing' })
      const { default: handler } = await import('../../../server/api/auth/register.post')

      await expect(
        handler({ body: { username: 'u1', email: 'u1@example.com', password: 'secret123' } })
      ).rejects.toMatchObject({
        statusCode: 409,
        message: 'Username or email already exists'
      })
    })

    it('creates a user and returns success payload', async () => {
      findOneMock.mockResolvedValue(null)
      createMock.mockResolvedValue({ _id: 'new-user-id' })

      const { default: handler } = await import('../../../server/api/auth/register.post')
      const result = await handler({
        body: { username: 'newuser', email: 'new@example.com', password: 'secret123' }
      })

      expect(result).toEqual({ success: true, userId: 'new-user-id' })
      expect(createMock).toHaveBeenCalledWith({
        username: 'newuser',
        email: 'new@example.com',
        password: 'secret123'
      })
    })
  })

  describe('/api/auth/login', () => {
    it('rejects invalid credentials when user is missing', async () => {
      findOneMock.mockResolvedValue(null)
      const { default: handler } = await import('../../../server/api/auth/login.post')

      await expect(
        handler({ body: { usernameOrEmail: 'missing', password: 'secret123' } })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    })

    it('rejects invalid credentials when password check fails', async () => {
      findOneMock.mockResolvedValue({
        comparePassword: vi.fn().mockResolvedValue(false)
      })

      const { default: handler } = await import('../../../server/api/auth/login.post')

      await expect(
        handler({ body: { usernameOrEmail: 'user', password: 'wrong' } })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid credentials'
      })
    })

    it('returns token and user payload for valid credentials', async () => {
      findOneMock.mockResolvedValue({
        _id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        comparePassword: vi.fn().mockResolvedValue(true)
      })
      signMock.mockReturnValue('signed-token')

      const { default: handler } = await import('../../../server/api/auth/login.post')
      const result = await handler({ body: { usernameOrEmail: 'testuser', password: 'secret123' } })

      expect(signMock).toHaveBeenCalled()
      expect(result).toEqual({
        token: 'signed-token',
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        }
      })
    })
  })

  describe('/api/auth/verify', () => {
    it('rejects missing bearer token', async () => {
      const { default: handler } = await import('../../../server/api/auth/verify.get')

      await expect(handler({ headers: {} })).rejects.toMatchObject({
        statusCode: 401,
        message: 'No token provided'
      })
    })

    it('returns user data for valid bearer token', async () => {
      verifyMock.mockReturnValue({ userId: 'user-123' })
      findByIdMock.mockReturnValue({
        select: vi.fn().mockResolvedValue({ id: 'user-123', username: 'testuser', email: 'test@example.com' })
      })

      const { default: handler } = await import('../../../server/api/auth/verify.get')
      const result = await handler({ headers: { authorization: 'Bearer signed-token' } })

      expect(verifyMock).toHaveBeenCalledWith('signed-token', 'test-secret')
      expect(result).toEqual({
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        }
      })
    })
  })
})

describe('Auth Middleware', () => {
  it('rejects protected API routes without token', async () => {
    const { default: middleware } = await import('../../../server/middleware/auth')

    await expect(middleware({ path: '/api/entries', headers: {}, context: {} })).rejects.toMatchObject({
      statusCode: 401,
      message: 'Authentication required'
    })
  })

  it('allows public auth routes without token', async () => {
    const { default: middleware } = await import('../../../server/middleware/auth')

    await expect(
      middleware({ path: '/api/auth/login', headers: {}, context: {} })
    ).resolves.toBeUndefined()
  })

  it('attaches user context for valid token on protected routes', async () => {
    verifyMock.mockReturnValue({ userId: 'user-123' })
    findByIdMock.mockReturnValue({
      select: vi.fn().mockResolvedValue({ id: 'user-123', username: 'testuser' })
    })

    const event = {
      path: '/api/entries',
      headers: { authorization: 'Bearer signed-token' },
      context: {}
    }

    const { default: middleware } = await import('../../../server/middleware/auth')
    await middleware(event)

    expect(event.context).toMatchObject({
      userId: 'user-123',
      user: { id: 'user-123', username: 'testuser' }
    })
  })
})
