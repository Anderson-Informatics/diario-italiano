import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

describe('Auth Unit Tests', () => {
  describe('Password Hashing', () => {
    it('should hash password with bcrypt', async () => {
      const password = 'mypassword123'
      const salt = await bcrypt.genSalt(10)
      const hashed = await bcrypt.hash(password, salt)
      
      expect(hashed).not.toBe(password)
      expect(typeof hashed).toBe('string')
    })

    it('should compare password correctly', async () => {
      const password = 'mypassword123'
      const hashed = await bcrypt.hash(password, 10)
      
      const match = await bcrypt.compare(password, hashed)
      expect(match).toBe(true)
      
      const noMatch = await bcrypt.compare('wrongpassword', hashed)
      expect(noMatch).toBe(false)
    })
  })

  describe('JWT Token', () => {
    it('should sign and verify token', () => {
      const payload = { userId: '123', username: 'testuser' }
      const secret = 'test-secret-key'
      
      const token = jwt.sign(payload, secret, { expiresIn: '7d' })
      
      expect(typeof token).toBe('string')
      
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload
      expect(decoded.userId).toBe('123')
      expect(decoded.username).toBe('testuser')
    })

    it('should reject invalid token', () => {
      const secret = 'test-secret-key'
      const token = 'invalid-token'
      
      expect(() => jwt.verify(token, secret)).toThrow()
    })
  })

  describe('Input Validation', () => {
    it('should validate email format', () => {
      const validEmails = ['test@example.com', 'user.name@domain.org']
      const invalidEmails = ['invalid', 'no@domain', '@nodomain.com']
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      
      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true)
      })
      
      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })

    it('should validate password length', () => {
      const shortPassword = '12345'
      const validPassword = '12345678'
      
      expect(shortPassword.length).toBeLessThan(6)
      expect(validPassword.length).toBeGreaterThanOrEqual(6)
    })
  })
})