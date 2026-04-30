import { Schema, model, Document, type ObjectId } from 'mongoose'

export interface IJournalEntry extends Document {
  userId: ObjectId
  content: string
  word_count: number
  created_at: Date
  updated_at: Date
}

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    word_count: { type: Number, default: 0 }
  },
  {
    timestamps: {
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    },
    collection: 'journal_entries'
  }
)

// Pre-save hook to calculate word count
JournalEntrySchema.pre('save', function () {
  if (this.isModified('content') || this.isNew) {
    this.word_count = this.content.trim().split(/\s+/).filter(word => word.length > 0).length
  }
})

export const JournalEntry = model<IJournalEntry>('JournalEntry', JournalEntrySchema)