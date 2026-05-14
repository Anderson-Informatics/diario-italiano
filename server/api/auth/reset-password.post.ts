import { User } from '../../models/User'
import { hashPasswordResetToken } from '../../utils/passwordReset'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const token = String(body?.token ?? '').trim()
  const password = String(body?.password ?? '')

  if (!token) {
    throw createError({ statusCode: 400, message: 'Reset token is required' })
  }

  if (password.length < 6) {
    throw createError({ statusCode: 400, message: 'Password must be at least 6 characters' })
  }

  const hashedToken = hashPasswordResetToken(token)

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiresAt: { $gt: new Date() }
  })

  if (!user) {
    throw createError({ statusCode: 400, message: 'Reset token is invalid or expired' })
  }

  user.password = password
  user.passwordResetToken = undefined
  user.passwordResetExpiresAt = undefined
  await user.save()

  return {
    success: true,
    message: 'Password has been reset successfully'
  }
})
