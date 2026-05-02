import bcrypt from 'bcryptjs'
import { Schema, model, Document } from 'mongoose'
import { DEFAULT_TIMEZONE, isValidTimeZone } from '../utils/timezone'

type WritingReviewPhase = 'A1-A2' | 'B1-B2' | 'C1-C2'

interface ISavedTip {
  tipId: string
  tip: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  reference_link?: string
  original?: string
  corrected?: string
  savedAt: Date
}

export interface IUser extends Document {
  username: string
  email: string
  password: string
  timezone: string
  useTargetReviewPhase: boolean
  targetReviewPhase: WritingReviewPhase
  savedTips: ISavedTip[]
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const SavedTipSchema = new Schema<ISavedTip>(
  {
    tipId: { type: String, required: true },
    tip: { type: String, required: true },
    type: { type: String, enum: ['grammar', 'spelling', 'vocabulary'], required: true },
    reference_link: { type: String },
    original: { type: String },
    corrected: { type: String },
    savedAt: { type: Date, default: Date.now }
  },
  { _id: false }
)

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    timezone: {
      type: String,
      default: DEFAULT_TIMEZONE,
      validate: {
        validator: (value: string) => isValidTimeZone(value),
        message: 'Invalid timezone'
      }
    },
    useTargetReviewPhase: {
      type: Boolean,
      default: false
    },
    targetReviewPhase: {
      type: String,
      enum: ['A1-A2', 'B1-B2', 'C1-C2'],
      default: 'B1-B2'
    },
    savedTips: { type: [SavedTipSchema], default: [] }
  },
  {
    timestamps: true
  }
)

// Pre-save hook for password hashing (Mongoose 9+ supports async hooks)
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return
  }
  
  const salt = bcrypt.genSaltSync(10)
  this.password = bcrypt.hashSync(this.password, salt)
})

// Instance method to compare password
UserSchema.methods.comparePassword = function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password)
}

export const User = model<IUser>('User', UserSchema)