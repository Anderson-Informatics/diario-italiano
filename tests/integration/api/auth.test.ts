import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'
import jwt from 'jsonwebtoken'

// Import models - need to ensure mongoose is connected first
import { User } from '../../../server/models/User'

let mongoServer: MongoMemoryServer

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        storageEngine: 'wiredTiger'
      }
    })
    const mongoUri = mongoServer.getUri()
    
    // Disconnect from any existing connection
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

  describe('User Model', () => {
    it('should create a user with hashed password', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }

      const user = new User(userData)
      await user.save()

      expect(user._id).toBeDefined()
      expect(user.password).not.toBe(userData.password)
      expect(user.password).toMatch(/^\$2[aby]\$/)
    })

    it('should compare passwords correctly', async () => {
      const user = new User({
        username: 'testuser2',
        email: 'test2@example.com',
        password: 'correctpassword'
      })
      await user.save()

      const isMatch = await user.comparePassword('correctpassword')
      expect(isMatch).toBe(true)

      const isNotMatch = await user.comparePassword('wrongpassword')
      expect(isNotMatch).toBe(false)
    })

    it('should not rehash password if unchanged', async () => {
      const user = new User({
        username: 'testuser3',
        email: 'test3@example.com',
        password: 'originalpassword'
      })
      await user.save()
      const originalHash = user.password

      user.username = 'testuser3updated'
      await user.save()

      expect(user.password).toBe(originalHash)
    })
  })

  describe('User Registration Flow', () => {
    it('should fail with duplicate username', async () => {
      await User.create({
        username: 'duplicate',
        email: 'duplicate@example.com',
        password: 'password123'
      })

      try {
        await User.create({
          username: 'duplicate',
          email: 'another@example.com',
          password: 'password123'
        })
        expect.fail('Should have thrown duplicate key error')
      } catch (error: any) {
        expect(error.code).toBe(11000)
      }
    })

    it('should fail with duplicate email', async () => {
      await User.create({
        username: 'uniqueuser',
        email: 'unique@example.com',
        password: 'password123'
      })

      try {
        await User.create({
          username: 'anotheruser',
          email: 'unique@example.com',
          password: 'password123'
        })
        expect.fail('Should have thrown duplicate key error')
      } catch (error: any) {
        expect(error.code).toBe(11000)
      }
    })
  })

  describe('JWT Token', () => {
    it('should create token with correct payload', () => {
      const secret = 'test-secret'
      const payload = { userId: '123', username: 'testuser' }
      
      const token = jwt.sign(payload, secret, { expiresIn: '7d' })
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload
      
      expect(decoded.userId).toBe('123')
      expect(decoded.username).toBe('testuser')
    })

    it('should reject expired token', async () => {
      const secret = 'test-secret'
      const token = jwt.sign({ userId: '123' }, secret, { expiresIn: '1ms' })
      
      await new Promise(resolve => setTimeout(resolve, 10))
      
      expect(() => jwt.verify(token, secret)).toThrow('jwt expired')
    })
  })
})