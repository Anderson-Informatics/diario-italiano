// Type definitions for Italian Daily Journal

// User types
export interface User {
  _id: string
  username: string
  email: string
  createdAt: Date
  updatedAt: Date
}

// Journal Entry types
export interface Correction {
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  tip?: string
}

export interface ReviewStats {
  total_errors: number
  grammar: number
  spelling: number
  vocabulary: number
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

export interface Review {
  corrections: Correction[]
  stats: ReviewStats
  cefrLevel: CEFRLevel
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