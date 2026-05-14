import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

const findOneMock = vi.fn()
const createMock = vi.fn()
const findByIdMock = vi.fn()
const findByIdAndUpdateMock = vi.fn()

const signMock = vi.fn()
const verifyMock = vi.fn()
const fetchMock = vi.fn()

const createErrorMock = vi.fn((input: { statusCode: number; message: string }) =>
  Object.assign(new Error(input.message), input)
)

vi.mock('../../../server/models/User', () => ({
  User: {
    findOne: findOneMock,
    create: createMock,
    findById: findByIdMock,
    findByIdAndUpdate: findByIdAndUpdateMock
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
  vi.stubGlobal('useRuntimeConfig', vi.fn(() => ({
    jwtSecret: 'test-secret',
    appBaseUrl: 'http://localhost:3000',
    mailgunApiKey: 'test-mailgun-key',
    mailgunDomain: 'mg.example.com',
    mailgunFrom: 'Diario Italiano <no-reply@example.com>'
  })))
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('createError', createErrorMock)

  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    text: vi.fn().mockResolvedValue('ok')
  })
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
        password: 'secret123',
        timezone: 'UTC'
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
        timezone: 'Europe/Rome',
        useTargetReviewPhase: true,
        targetReviewPhase: 'B1-B2',
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
          email: 'test@example.com',
          timezone: 'Europe/Rome',
          useTargetReviewPhase: true,
          targetReviewPhase: 'B1-B2'
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
        select: vi.fn().mockResolvedValue({
          _id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'America/New_York',
          useTargetReviewPhase: false,
          targetReviewPhase: 'B1-B2'
        })
      })

      const { default: handler } = await import('../../../server/api/auth/verify.get')
      const result = await handler({ headers: { authorization: 'Bearer signed-token' } })

      expect(verifyMock).toHaveBeenCalledWith('signed-token', 'test-secret')
      expect(result).toEqual({
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'America/New_York',
          useTargetReviewPhase: false,
          targetReviewPhase: 'B1-B2'
        }
      })
    })
  })

  describe('/api/auth/forgot-password', () => {
    it('rejects invalid email input', async () => {
      const { default: handler } = await import('../../../server/api/auth/forgot-password.post')

      await expect(handler({ body: { email: 'not-an-email' } })).rejects.toMatchObject({
        statusCode: 400,
        message: 'A valid email is required'
      })
    })

    it('returns generic success for unknown email', async () => {
      findOneMock.mockResolvedValue(null)

      const { default: handler } = await import('../../../server/api/auth/forgot-password.post')
      const result = await handler({ body: { email: 'missing@example.com' } })

      expect(result).toEqual({
        success: true,
        message: 'If an account exists for this email, a reset link has been sent.'
      })
    })

    it('stores hashed reset token and returns reset URL outside production', async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined)
      const user = {
        email: 'test@example.com',
        save: saveMock,
        passwordResetToken: undefined,
        passwordResetExpiresAt: undefined
      }
      findOneMock.mockResolvedValue(user)

      const { default: handler } = await import('../../../server/api/auth/forgot-password.post')
      const result = await handler({ body: { email: 'test@example.com' } })

      expect(fetchMock).toHaveBeenCalledOnce()
      expect(saveMock).toHaveBeenCalledOnce()
      expect(typeof result.resetToken).toBe('string')
      expect(result.resetUrl).toContain('/reset-password?token=')
      expect(user.passwordResetToken).toBe(
        createHash('sha256').update(result.resetToken).digest('hex')
      )
      expect(user.passwordResetExpiresAt).toBeInstanceOf(Date)
    })

    it('clears stored reset token when email send fails', async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined)
      const user = {
        email: 'test@example.com',
        save: saveMock,
        passwordResetToken: undefined,
        passwordResetExpiresAt: undefined
      }
      findOneMock.mockResolvedValue(user)

      fetchMock.mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('mailgun error')
      })

      const { default: handler } = await import('../../../server/api/auth/forgot-password.post')
      const result = await handler({ body: { email: 'test@example.com' } })

      expect(result.success).toBe(true)
      expect(fetchMock).toHaveBeenCalledOnce()
      expect(saveMock).toHaveBeenCalledTimes(2)
      expect(user.passwordResetToken).toBeUndefined()
      expect(user.passwordResetExpiresAt).toBeUndefined()
    })
  })

  describe('/api/auth/reset-password', () => {
    it('rejects missing reset token', async () => {
      const { default: handler } = await import('../../../server/api/auth/reset-password.post')

      await expect(handler({ body: { password: 'newpass123' } })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Reset token is required'
      })
    })

    it('rejects short passwords', async () => {
      const { default: handler } = await import('../../../server/api/auth/reset-password.post')

      await expect(handler({ body: { token: 'abc', password: '123' } })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Password must be at least 6 characters'
      })
    })

    it('rejects invalid or expired reset token', async () => {
      findOneMock.mockResolvedValue(null)

      const { default: handler } = await import('../../../server/api/auth/reset-password.post')

      await expect(handler({ body: { token: 'invalid', password: 'newpass123' } })).rejects.toMatchObject({
        statusCode: 400,
        message: 'Reset token is invalid or expired'
      })
    })

    it('updates password and clears token metadata for valid token', async () => {
      const saveMock = vi.fn().mockResolvedValue(undefined)
      const user = {
        password: 'old-pass',
        passwordResetToken: 'old-token-hash',
        passwordResetExpiresAt: new Date(Date.now() + 1000),
        save: saveMock
      }

      findOneMock.mockResolvedValue(user)

      const { default: handler } = await import('../../../server/api/auth/reset-password.post')
      const result = await handler({ body: { token: 'valid-token', password: 'newpass123' } })

      expect(saveMock).toHaveBeenCalledOnce()
      expect(user.password).toBe('newpass123')
      expect(user.passwordResetToken).toBeUndefined()
      expect(user.passwordResetExpiresAt).toBeUndefined()
      expect(result).toEqual({
        success: true,
        message: 'Password has been reset successfully'
      })
    })
  })

  describe('/api/auth/profile', () => {
    it('rejects unauthorized profile update requests', async () => {
      const { default: handler } = await import('../../../server/api/auth/profile.put')

      await expect(
        handler({ context: {}, body: { timezone: 'Europe/Rome' } })
      ).rejects.toMatchObject({
        statusCode: 401,
        message: 'Unauthorized'
      })
    })

    it('updates timezone for authenticated user', async () => {
      findByIdAndUpdateMock.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'Europe/Rome',
          useTargetReviewPhase: true,
          targetReviewPhase: 'C1-C2'
        })
      })

      const { default: handler } = await import('../../../server/api/auth/profile.put')
      const result = await handler({
        context: { userId: 'user-123' },
        body: { timezone: 'Europe/Rome' }
      })

      expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
        'user-123',
        { $set: { timezone: 'Europe/Rome' } },
        { new: true }
      )
      expect(result).toEqual({
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'Europe/Rome',
          useTargetReviewPhase: true,
          targetReviewPhase: 'C1-C2'
        }
      })
    })

    it('updates review preference for authenticated user', async () => {
      findByIdAndUpdateMock.mockReturnValue({
        select: vi.fn().mockResolvedValue({
          _id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'Europe/Rome',
          useTargetReviewPhase: true,
          targetReviewPhase: 'B1-B2'
        })
      })

      const { default: handler } = await import('../../../server/api/auth/profile.put')
      const result = await handler({
        context: { userId: 'user-123' },
        body: { useTargetReviewPhase: true, targetReviewPhase: 'B1-B2' }
      })

      expect(findByIdAndUpdateMock).toHaveBeenCalledWith(
        'user-123',
        { $set: { useTargetReviewPhase: true, targetReviewPhase: 'B1-B2' } },
        { new: true }
      )
      expect(result).toEqual({
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          timezone: 'Europe/Rome',
          useTargetReviewPhase: true,
          targetReviewPhase: 'B1-B2'
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

    await expect(
      middleware({ path: '/api/auth/forgot-password', headers: {}, context: {} })
    ).resolves.toBeUndefined()

    await expect(
      middleware({ path: '/api/auth/reset-password', headers: {}, context: {} })
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
