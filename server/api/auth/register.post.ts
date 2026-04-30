import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, email, password } = body
  
  // Validation
  if (!username || !email || !password) {
    throw createError({ statusCode: 400, message: 'All fields required' })
  }
  
  // Check existing user
  const existing = await User.findOne({
    $or: [{ username }, { email }]
  })
  if (existing) {
    throw createError({ statusCode: 409, message: 'Username or email already exists' })
  }
  
  // Create user (password hashed via pre-save hook)
  const user = await User.create({ username, email, password })
  
  return { success: true, userId: user._id }
})