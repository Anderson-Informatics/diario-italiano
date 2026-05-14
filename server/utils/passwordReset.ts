import { createHash, randomBytes } from 'node:crypto'

export const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 60 // 1 hour

export function createPasswordResetToken(): {
  rawToken: string
  hashedToken: string
  expiresAt: Date
} {
  const rawToken = randomBytes(32).toString('hex')

  return {
    rawToken,
    hashedToken: hashPasswordResetToken(rawToken),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS)
  }
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
