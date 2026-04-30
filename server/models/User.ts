import bcrypt from 'bcryptjs'
import { Schema, model, Document } from 'mongoose'

export interface IUser extends Document {
  username: string
  email: string
  password: string
  createdAt: Date
  updatedAt: Date
  comparePassword(candidate: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
  {
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
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