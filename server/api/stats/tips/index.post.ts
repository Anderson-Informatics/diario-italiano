import { User } from '../../../models/User'
import { buildTipIdForSave } from '../../../utils/stats'

interface SaveTipBody {
  tip: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  reference_link?: string
  original?: string
  corrected?: string
}

export default defineEventHandler(async (event) => {
  const userId = event.context.userId

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = (await readBody(event)) as SaveTipBody
  if (!body.tip || !body.type) {
    throw createError({ statusCode: 400, message: 'Tip and type are required' })
  }

  const tipId = buildTipIdForSave({
    tip: body.tip,
    type: body.type,
    original: body.original ?? '',
    corrected: body.corrected ?? ''
  })

  const user = await User.findById(userId)
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' })
  }

  const alreadySaved = user.savedTips.some((savedTip) => savedTip.tipId === tipId)
  if (alreadySaved) {
    return { tipId, saved: true }
  }

  user.savedTips.push({
    tipId,
    tip: body.tip,
    type: body.type,
    reference_link: body.reference_link,
    original: body.original,
    corrected: body.corrected,
    savedAt: new Date()
  })

  await user.save()

  return { tipId, saved: true }
})
