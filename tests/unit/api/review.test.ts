import { describe, it, expect } from 'vitest'
import type { Review } from '../../../app/types/index'

// Review response validation logic extracted from server/api/review.post.ts
function isValidReview(data: unknown): data is Review {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>

  if (typeof d.corrected_text !== 'string') return false
  if (!Array.isArray(d.corrections)) return false
  if (!d.stats || typeof d.stats !== 'object') return false
  if (!d.cefrLevel || typeof d.cefrLevel !== 'object') return false

  const stats = d.stats as Record<string, unknown>
  if (typeof stats.total_errors !== 'number') return false
  if (typeof stats.grammar !== 'number') return false
  if (typeof stats.spelling !== 'number') return false
  if (typeof stats.vocabulary !== 'number') return false

  const cefr = d.cefrLevel as Record<string, unknown>
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  if (!validLevels.includes(cefr.estimated as string)) return false
  if (typeof cefr.confidence !== 'number') return false
  if (!Array.isArray(cefr.recommendations)) return false

  return true
}

const validReview: Review = {
  corrected_text: 'Ho mangiato una mela.',
  corrections: [
    {
      original: 'mangiata',
      corrected: 'mangiato',
      type: 'grammar',
      tip: 'Past participle agrees with subject when using avere.',
      reference_link: 'https://example.com/grammar'
    }
  ],
  stats: { total_errors: 1, grammar: 1, spelling: 0, vocabulary: 0 },
  cefrLevel: {
    estimated: 'A2',
    confidence: 75,
    recommendations: [
      { area: 'Passato prossimo', suggestion: 'Practice with avere.', examples: ['Ho mangiato.'] }
    ]
  }
}

describe('isValidReview', () => {
  it('accepts a valid review object', () => {
    expect(isValidReview(validReview)).toBe(true)
  })

  it('accepts a review with empty corrections', () => {
    const noErrors: Review = {
      ...validReview,
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 }
    }
    expect(isValidReview(noErrors)).toBe(true)
  })

  it('rejects null', () => {
    expect(isValidReview(null)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(isValidReview('string')).toBe(false)
    expect(isValidReview(42)).toBe(false)
  })

  it('rejects missing corrected_text', () => {
    const { corrected_text: _omit, ...rest } = validReview as Record<string, unknown>
    expect(isValidReview(rest)).toBe(false)
  })

  it('rejects non-string corrected_text', () => {
    expect(isValidReview({ ...validReview, corrected_text: 123 })).toBe(false)
  })

  it('rejects missing corrections array', () => {
    const { corrections: _omit, ...rest } = validReview as Record<string, unknown>
    expect(isValidReview(rest)).toBe(false)
  })

  it('rejects missing stats', () => {
    const { stats: _omit, ...rest } = validReview as Record<string, unknown>
    expect(isValidReview(rest)).toBe(false)
  })

  it('rejects stats with missing total_errors', () => {
    expect(isValidReview({ ...validReview, stats: { grammar: 1, spelling: 0, vocabulary: 0 } })).toBe(false)
  })

  it('rejects missing cefrLevel', () => {
    const { cefrLevel: _omit, ...rest } = validReview as Record<string, unknown>
    expect(isValidReview(rest)).toBe(false)
  })

  it('rejects invalid CEFR estimated level', () => {
    expect(isValidReview({ ...validReview, cefrLevel: { ...validReview.cefrLevel, estimated: 'Z9' } })).toBe(false)
  })

  it('rejects non-number CEFR confidence', () => {
    expect(isValidReview({ ...validReview, cefrLevel: { ...validReview.cefrLevel, confidence: '75%' } })).toBe(false)
  })

  it('accepts all valid CEFR estimated levels', () => {
    for (const level of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
      expect(isValidReview({ ...validReview, cefrLevel: { ...validReview.cefrLevel, estimated: level } })).toBe(true)
    }
  })
})
