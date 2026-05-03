import { Schema, model, Document, type ObjectId } from 'mongoose'

interface ICorrectionDoc {
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary' | 'punctuation' | 'idiomatic' | 'register'
  tip?: string
  reference_link?: string
  tags?: string[]
}

interface IWritingPriorityDoc {
  title: string
  detail: string
}

interface IWritingDimensionScoreDoc {
  dimension: 'taskFulfillment' | 'organization' | 'grammarControl' | 'lexicalRange' | 'cohesion' | 'register'
  score: number
  rationale?: string
}

interface IWritingFeedbackDoc {
  phase: 'A1-A2' | 'B1-B2' | 'C1-C2'
  strengths: string[]
  priorities: IWritingPriorityDoc[]
  dimensionScores: IWritingDimensionScoreDoc[]
  modelRewrite?: string
  followUpTask?: {
    prompt: string
    instructions: string
  }
}

interface IReviewDoc {
  reviewSchemaVersion?: 1 | 2
  corrected_text: string
  corrections: ICorrectionDoc[]
  stats: {
    total_errors: number
    grammar: number
    spelling: number
    vocabulary: number
    punctuation?: number
    idiomatic?: number
    register?: number
  }
  cefrLevel: {
    estimated: string
    confidence: number
    recommendations: Array<{ area: string; suggestion: string; examples: string[] }>
  }
  writing?: IWritingFeedbackDoc
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
    type: { type: String, enum: ['grammar', 'spelling', 'vocabulary', 'punctuation', 'idiomatic', 'register'], required: true },
    tip: { type: String },
    reference_link: { type: String },
    tags: { type: [String], default: undefined }
  },
  { _id: false }
)

const WritingPrioritySchema = new Schema<IWritingPriorityDoc>(
  {
    title: { type: String, required: true },
    detail: { type: String, required: true }
  },
  { _id: false }
)

const WritingDimensionScoreSchema = new Schema<IWritingDimensionScoreDoc>(
  {
    dimension: {
      type: String,
      enum: ['taskFulfillment', 'organization', 'grammarControl', 'lexicalRange', 'cohesion', 'register'],
      required: true
    },
    score: { type: Number, min: 1, max: 5, required: true },
    rationale: { type: String }
  },
  { _id: false }
)

const WritingFeedbackSchema = new Schema<IWritingFeedbackDoc>(
  {
    phase: { type: String, enum: ['A1-A2', 'B1-B2', 'C1-C2'], required: true },
    strengths: { type: [String], default: [] },
    priorities: { type: [WritingPrioritySchema], default: [] },
    dimensionScores: { type: [WritingDimensionScoreSchema], default: [] },
    modelRewrite: { type: String },
    followUpTask: {
      prompt: { type: String },
      instructions: { type: String }
    }
  },
  { _id: false }
)

const ReviewSchema = new Schema<IReviewDoc>(
  {
    reviewSchemaVersion: { type: Number, enum: [1, 2], required: false },
    corrected_text: { type: String, required: true },
    corrections: { type: [CorrectionSchema], default: [] },
    stats: {
      total_errors: { type: Number, default: 0 },
      grammar: { type: Number, default: 0 },
      spelling: { type: Number, default: 0 },
      vocabulary: { type: Number, default: 0 },
      punctuation: { type: Number, default: 0 },
      idiomatic: { type: Number, default: 0 },
      register: { type: Number, default: 0 }
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
    },
    writing: { type: WritingFeedbackSchema, required: false }
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