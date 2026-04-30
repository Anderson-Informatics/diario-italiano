import mongoose from 'mongoose'

export default defineNitroPlugin(() => {
  mongoose.set('bufferCommands', false)
})