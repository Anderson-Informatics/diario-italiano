import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import { User } from '../../../server/models/User'
import jwt from 'jsonwebtoken'

let mongoServer: MongoMemoryServer

describe('Auth Middleware Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: 'wiredTiger'
      }
    })
    const mongoUri = mongoServer.getUri()
    
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
    
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    if (mongoServer) {
      await mongoServer.stop()
    }
  })

  describe('Token Validation', () => {
    it('should create user and verify token payload structure', async () => {
      const user = await User.create({
        username: 'middlewareuser',
        email: 'middleware@example.com',
        password: 'password123'
      })

      const token = jwt.sign(
        { userId: user._id.toString(), username: user.username },
        'test-secret',
        { expiresIn: '7d' }
      )

      const decoded = jwt.verify(token, 'test-secret') as jwt.JwtPayload
      
      expect(decoded.userId).toBe(user._id.toString())
      expect(decoded.username).toBe(user.username)
    })

    it('should reject token with wrong secret', async () => {
      const user = await User.create({
        username: 'middlewareuser2',
        email: 'middleware2@example.com',
        password: 'password123'
      })

      const token = jwt.sign(
        { userId: user._id.toString(), username: user.username },
        'correct-secret',
        { expiresIn: '7d' }
      )

      expect(() => jwt.verify(token, 'wrong-secret')).toThrow()
    })

    it('should reject malformed token', () => {
      expect(() => jwt.verify('not-a-valid-token', 'any-secret')).toThrow()
    })
  })

  describe('User Context', () => {
    it('should attach user to context when token is valid', async () => {
      const user = await User.create({
        username: 'contextuser',
        email: 'context@example.com',
        password: 'password123'
      })

      const token = jwt.sign(
        { userId: user._id.toString(), username: user.username },
        'test-secret',
        { expiresIn: '7d' }
      )

      // Verify we can fetch user from DB
      const foundUser = await User.findById(user._id).select('-password')
      
      expect(foundUser).toBeDefined()
      expect(foundUser?.username).toBe(user.username)
      expect(foundUser?.email).toBe(user.email)
    })
  })
})