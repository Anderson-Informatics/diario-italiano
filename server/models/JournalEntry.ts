import { Schema, model, Document, type ObjectId } from 'mongoose'

interface ICorrectionDoc {
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  tip?: string
  reference_link?: string
}

interface IReviewDoc {
  corrected_text: string
  corrections: ICorrectionDoc[]
  stats: {
    total_errors: number
    grammar: number
    spelling: number
    vocabulary: number
  }
  cefrLevel: {
    estimated: string
    confidence: number
    recommendations: Array<{ area: string; suggestion: string; examples: string[] }>
  }
}

export interface IJournalEntry extends Document {
  userId: ObjectId
  content: string
  word_count: number
  review?: IReviewDoc
  created_at: Date
  updated_at: Date
}

const CorrectionSchema = new Schema<ICorrectionDoc>(
  {
    original: { type: String, required: true },
    corrected: { type: String, required: true },
    type: { type: String, enum: ['grammar', 'spelling', 'vocabulary'], required: true },
    tip: { type: String },
    reference_link: { type: String }
  },
  { _id: false }
)

const ReviewSchema = new Schema<IReviewDoc>(
  {
    corrected_text: { type: String, required: true },
    corrections: { type: [CorrectionSchema], default: [] },
    stats: {
      total_errors: { type: Number, default: 0 },
      grammar: { type: Number, default: 0 },
      spelling: { type: Number, default: 0 },
      vocabulary: { type: Number, default: 0 }
    },
    cefrLevel: {
      estimated: { type: String },
      confidence: { type: Number },
      recommendations: [
        {
          area: { type: String },
          suggestion: { type: String },
          examples: [{ type: String }],
          _id: false
        }
      ]
    }
  },
  { _id: false }
)

const JournalEntrySchema = new Schema<IJournalEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, default: '' },
    word_count: { type: Number, default: 0 },
    review: { type: ReviewSchema }
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