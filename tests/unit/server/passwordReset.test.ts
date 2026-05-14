import { describe, expect, it } from 'vitest'
import {
  PASSWORD_RESET_TOKEN_TTL_MS,
  createPasswordResetToken,
  hashPasswordResetToken
} from '../../../server/utils/passwordReset'

describe('password reset token helpers', () => {
  it('creates a random token with a hashed representation', () => {
    const first = createPasswordResetToken()
    const second = createPasswordResetToken()

    expect(first.rawToken).not.toHaveLength(0)
    expect(first.rawToken).not.toBe(second.rawToken)
    expect(first.hashedToken).toBe(hashPasswordResetToken(first.rawToken))
  })

  it('sets expiration around the configured TTL', () => {
    const now = Date.now()
    const { expiresAt } = createPasswordResetToken()

    expect(expiresAt.getTime()).toBeGreaterThan(now)
    expect(expiresAt.getTime()).toBeLessThanOrEqual(now + PASSWORD_RESET_TOKEN_TTL_MS + 1000)
  })
})
