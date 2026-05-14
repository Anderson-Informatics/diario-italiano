import { User } from '../../models/User'
import { createPasswordResetToken } from '../../utils/passwordReset'

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function sendPasswordResetEmail(options: {
  apiKey: string
  domain: string
  from: string
  to: string
  resetUrl: string
}): Promise<void> {
  const html = `
    <div style="margin:0;padding:24px;background:#eff6ff;background:linear-gradient(135deg,#eff6ff 0%,#ffffff 55%,#e0e7ff 100%);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#1f2937;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;">
        <tr>
          <td style="padding:0;">
            <div style="border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#ffffff;box-shadow:0 8px 24px rgba(17,24,39,0.08);">
              <div style="padding:20px 24px;background:#ffffff;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;gap:10px;">
                <div style="width:36px;height:36px;line-height:36px;text-align:center;border-radius:10px;background:linear-gradient(135deg,#22c55e 0%,#ffffff 50%,#ef4444 100%);font-size:18px;">🇮🇹</div>
                <div style="font-size:18px;font-weight:700;color:#1f2937;">Diario Italiano</div>
              </div>

              <div style="padding:28px 24px 12px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#111827;">Reset Your Password</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4b5563;">
                  We received a request to reset your Diario Italiano password. Click the button below to set a new password.
                </p>

                <p style="margin:0 0 22px;">
                  <a href="${options.resetUrl}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#2563eb;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">Reset password</a>
                </p>

                <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:#6b7280;">
                  This link expires in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.
                </p>

                <p style="margin:0 0 20px;font-size:12px;line-height:1.6;color:#9ca3af;word-break:break-all;">
                  If the button does not work, copy and paste this URL into your browser:<br />
                  <a href="${options.resetUrl}" style="color:#2563eb;text-decoration:underline;">${options.resetUrl}</a>
                </p>
              </div>

              <div style="padding:14px 24px;border-top:1px solid #f3f4f6;background:#f9fafb;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
                © 2026 Italian Daily Journal. Build your Italian writing skills daily.
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `

  const response = await fetch(`https://api.mailgun.net/v3/${options.domain}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${options.apiKey}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      from: options.from,
      to: options.to,
      subject: 'Reset your Diario Italiano password',
      text: `We received a password reset request for your account.\n\nUse this link to reset your password:\n${options.resetUrl}\n\nThis link expires in 1 hour.`,
      html
    })
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Mailgun request failed (${response.status}): ${details}`)
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const body = await readBody(event)
  const email = String(body?.email ?? '').trim().toLowerCase()
  const appBaseUrl = String(config.appBaseUrl || 'http://localhost:3000').replace(/\/$/, '')

  if (!email || !isValidEmail(email)) {
    throw createError({ statusCode: 400, message: 'A valid email is required' })
  }

  const genericResponse = {
    success: true,
    message: 'If an account exists for this email, a reset link has been sent.'
  }

  const user = await User.findOne({ email })

  if (!user) {
    return genericResponse
  }

  const { rawToken, hashedToken, expiresAt } = createPasswordResetToken()
  const resetUrl = `${appBaseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`

  user.passwordResetToken = hashedToken
  user.passwordResetExpiresAt = expiresAt
  await user.save()

  const mailgunApiKey = String(config.mailgunApiKey || '').trim()
  const mailgunDomain = String(config.mailgunDomain || '').trim()
  const mailgunFrom = String(config.mailgunFrom || `Diario Italiano <no-reply@${mailgunDomain}>`).trim()

  const canSendEmail = Boolean(mailgunApiKey && mailgunDomain)

  if (canSendEmail) {
    try {
      await sendPasswordResetEmail({
        apiKey: mailgunApiKey,
        domain: mailgunDomain,
        from: mailgunFrom,
        to: email,
        resetUrl
      })
    } catch (error) {
      user.passwordResetToken = undefined
      user.passwordResetExpiresAt = undefined
      await user.save()

      console.error('[auth] Failed to send password reset email', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  } else {
    console.warn('[auth] Password reset email not sent because Mailgun config is missing')
  }

  if (process.env.NODE_ENV === 'production') {
    return genericResponse
  }

  return {
    ...genericResponse,
    resetToken: rawToken,
    resetUrl,
    expiresAt: expiresAt.toISOString()
  }
})
