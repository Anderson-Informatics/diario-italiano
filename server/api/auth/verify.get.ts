import jwt from 'jsonwebtoken'
import { User } from '../../models/User'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const authHeader = getRequestHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'No token provided' })
  }
  
  const token = authHeader.slice(7)
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string }
    const user = await User.findById(payload.userId).select('-password')
    return { user }
  } catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
})