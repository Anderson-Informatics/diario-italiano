import jwt from 'jsonwebtoken'
import { User } from '../models/User'

const config = useRuntimeConfig()

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/register', '/api/auth/verify']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  
  // Skip auth for public API routes
  const isPublicApiRoute = PUBLIC_API_ROUTES.some(route => path.startsWith(route))
  
  // Check if this is an API route that needs protection
  const isProtectedApiRoute = path.startsWith('/api/') && !isPublicApiRoute
  
  const authHeader = getRequestHeader(event, 'authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7)
      const payload = jwt.verify(token, config.jwtSecret) as { userId: string }
      event.context.userId = payload.userId
      
      const user = await User.findById(payload.userId).select('-password')
      event.context.user = user
    } catch {
      // Invalid token - only reject for protected API routes
      if (isProtectedApiRoute) {
        throw createError({ statusCode: 401, message: 'Invalid token' })
      }
    }
  } else if (isProtectedApiRoute) {
    // No token provided for protected API route
    throw createError({ statusCode: 401, message: 'Authentication required' })
  }
  
  // For non-API routes (pages) and public API routes, no auth required
})