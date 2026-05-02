import jwt from 'jsonwebtoken'
import { User } from '../../models/User'

const config = useRuntimeConfig()

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { usernameOrEmail, password } = body
  
  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
  })
  
  if (!user || !(await user.comparePassword(password))) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }
  
  const token = jwt.sign(
    { userId: user._id, username: user.username },
    config.jwtSecret,
    { expiresIn: '7d' }
  )
  
  return {
    token,
    user: {
      id: String(user._id),
      username: user.username,
      email: user.email,
      timezone: user.timezone
    }
  }
})