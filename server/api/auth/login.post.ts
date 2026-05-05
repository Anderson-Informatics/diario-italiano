import jwt from 'jsonwebtoken'
import { User } from '../../models/User'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const { usernameOrEmail, password } = body
  
  const user = await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }]
  })
  
  if (!user || !(await user.comparePassword(password))) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials', message: 'Invalid credentials' })
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
      timezone: user.timezone,
      useTargetReviewPhase: user.useTargetReviewPhase,
      targetReviewPhase: user.targetReviewPhase
    }
  }
})