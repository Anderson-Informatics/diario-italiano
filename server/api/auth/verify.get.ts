import jwt from 'jsonwebtoken'
import { User } from '../../models/User'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No token provided' })
  }
  
  const token = authHeader.slice(7)
  let payload: { userId: string }

  try {
    payload = jwt.verify(token, config.jwtSecret) as { userId: string }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }

  const user = await User.findById(payload.userId).select('-password')
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  return {
    user: {
      id: String(user._id),
      username: user.username,
      email: user.email,
      timezone: user.timezone
    }
  }
})