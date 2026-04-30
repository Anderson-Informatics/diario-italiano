import jwt from 'jsonwebtoken'
import { User } from '../models/User'

const config = useRuntimeConfig()

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/verify']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  
  // Check if this is a public route
  const isPublicRoute = PUBLIC_ROUTES.some(route => path.startsWith(route))
  
  const authHeader = getRequestHeader(event, 'authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string }
      event.context.userId = payload.userId
      
      const user = await User.findById(payload.userId).select('-password')
      event.context.user = user
    } catch {
      // Invalid token
      if (!isPublicRoute) {
        throw createError({ statusCode: 401, message: 'Invalid token' })
      }
    }
  } else if (!isPublicRoute) {
    // No token provided for protected route
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }
})