// Type definitions for Italian Daily Journal

// User types
export interface User {
  _id: string
  username: string
  email: string
  timezone: string
  useTargetReviewPhase?: boolean
  targetReviewPhase?: WritingReviewPhase
  createdAt: Date
  updatedAt: Date
}

// Journal Entry types
export interface Correction {
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  tip?: string
  reference_link?: string
  tags?: string[]
}

export interface ReviewStats {
  total_errors: number
  grammar: number
  spelling: number
  vocabulary: number
  error_rate?: number
}

export interface CEFRRecommendations {
  area: string
  suggestion: string
  examples: string[]
}

export interface CEFRLevel {
  estimated: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
  confidence: number
  recommendations: CEFRRecommendations[]
}

export type WritingReviewPhase = 'A1-A2' | 'B1-B2' | 'C1-C2'

export type WritingReviewDimension =
  | 'taskFulfillment'
  | 'organization'
  | 'grammarControl'
  | 'lexicalRange'
  | 'cohesion'
  | 'register'

export interface WritingPriority {
  title: string
  detail: string
}

export interface WritingDimensionScore {
  dimension: WritingReviewDimension
  score: number
  rationale?: string
}

export interface WritingFollowUpTask {
  prompt: string
  instructions: string
}

export interface WritingFeedback {
  phase: WritingReviewPhase
  strengths: string[]
  priorities: WritingPriority[]
  dimensionScores: WritingDimensionScore[]
  modelRewrite?: string
  followUpTask?: WritingFollowUpTask
}

export interface Review {
  corrected_text: string
  corrections: Correction[]
  stats: ReviewStats
  cefrLevel: CEFRLevel
  writing?: WritingFeedback
}

export interface JournalEntry {
  _id: string
  userId: string
  date: Date
  content: string
  review?: Review
  createdAt: Date
  updatedAt: Date
}

// Calendar types
export interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEntry: boolean
}

export interface CalendarEntryMeta {
  entryId: string
  wordCount: number
  hasReview: boolean
}

export interface CalendarMonthDay {
  date: string
  entryId: string
  wordCount: number
  hasReview: boolean
}

export interface CalendarMonthResponse {
  month: {
    year: number
    month: number
  }
  days: CalendarMonthDay[]
  streak: number
}

export interface CalendarSelectionPayload {
  date: string
  hasEntry: boolean
  entryId?: string
  isPast: boolean
  isToday: boolean
  isFuture: boolean
}

export interface CalendarMonthChangePayload {
  year: number
  month: number
}

// Stats types
export interface FocusArea {
  name: string
  percentage: number
  color: 'blue' | 'purple' | 'green'
}

export interface DashboardStats {
  cefrLevel: string
  confidence: number
  streak: number
  focusAreas: FocusArea[]
}

export interface SavedTip {
  tipId: string
  tip: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  reference_link?: string
  original?: string
  corrected?: string
  savedAt: string
}

export interface TipInsight {
  tipId: string
  tip: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  reference_link?: string
  original: string
  corrected: string
  isSaved: boolean
}

export interface ErrorTrendPoint {
  date: string
  total_errors: number
  error_rate: number
}

export interface ErrorDistribution {
  grammar: number
  spelling: number
  vocabulary: number
  total: number
  grammarRate?: number
  spellingRate?: number
  vocabularyRate?: number
  averageRate?: number
}

export interface CEFRProgressPoint {
  date: string
  level: CEFRLevel['estimated'] | string
  confidence: number
}

export interface FocusRecommendation {
  area: string
  suggestion: string
  examples: string[]
  resourceLink: string
  errorCount: number
}

export interface StatsDashboardResponse {
  range: 'week' | 'month' | 'all'
  reviewedEntriesCount: number
  hasEnoughData: boolean
  summary: {
    entriesWritten: number
    averageErrorsPerEntry?: number
    averageErrorRate: number
    improvementRate: number
    currentStreak: number
  }
  monthlySummary: {
    mostCommonErrorType: 'grammar' | 'spelling' | 'vocabulary' | 'none'
    cefrCurrent: string
    cefrPrevious: string
    cefrDelta: number
  }
  errorDistribution: ErrorDistribution
  errorTrend: ErrorTrendPoint[]
  cefrProgression: CEFRProgressPoint[]
  focusRecommendations: FocusRecommendation[]
  tips: TipInsight[]
  savedTips: SavedTip[]
  consistency: {
    datesWithEntries: string[]
  }
}