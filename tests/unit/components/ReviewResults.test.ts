import { describe, it, expect } from 'vitest'
import type { Review } from '../../../app/types/index'

// Display logic extracted from ReviewResults.vue
function getBorderColor(type: string): string {
  const colors: Record<string, string> = {
    grammar: 'border-red-500',
    spelling: 'border-orange-500',
    vocabulary: 'border-blue-500'
  }
  return colors[type] ?? 'border-gray-300'
}

function getTagClass(type: string): string {
  const classes: Record<string, string> = {
    grammar: 'error-grammar',
    spelling: 'error-spelling',
    vocabulary: 'error-vocab'
  }
  return classes[type] ?? ''
}

// Correction count helper used in template
function hasCorrections(review: Review): boolean {
  return review.corrections.length > 0
}

// Stats display helper
function formatStats(review: Review): string {
  return `${review.stats.grammar} grammar · ${review.stats.spelling} spelling · ${review.stats.vocabulary} vocabulary`
}

// CEFR confidence display helper
function formatConfidence(confidence: number): string {
  return `${confidence}% confidence`
}

const mockReview: Review = {
  corrected_text: 'Ho mangiato una mela.',
  corrections: [
    {
      original: 'mangiata',
      corrected: 'mangiato',
      type: 'grammar',
      tip: 'Past participle agrees with subject, not object, when using avere.',
      reference_link: 'https://italian.stackexchange.com/questions/tagged/past-participle'
    },
    {
      original: 'pommo',
      corrected: 'mela',
      type: 'vocabulary',
      tip: 'The correct word for "apple" is "mela".'
    }
  ],
  stats: { total_errors: 2, grammar: 1, spelling: 0, vocabulary: 1 },
  cefrLevel: {
    estimated: 'A2',
    confidence: 78,
    recommendations: [
      {
        area: 'Past participle agreement',
        suggestion: 'Practice passato prossimo with avere vs essere.',
        examples: ['Ho mangiato la pizza.', 'Sono andato al mercato.']
      }
    ]
  }
}

describe('ReviewResults display logic', () => {
  describe('getBorderColor', () => {
    it('returns red for grammar errors', () => {
      expect(getBorderColor('grammar')).toBe('border-red-500')
    })

    it('returns orange for spelling errors', () => {
      expect(getBorderColor('spelling')).toBe('border-orange-500')
    })

    it('returns blue for vocabulary errors', () => {
      expect(getBorderColor('vocabulary')).toBe('border-blue-500')
    })

    it('returns fallback for unknown type', () => {
      expect(getBorderColor('unknown')).toBe('border-gray-300')
    })
  })

  describe('getTagClass', () => {
    it('returns error-grammar for grammar', () => {
      expect(getTagClass('grammar')).toBe('error-grammar')
    })

    it('returns error-spelling for spelling', () => {
      expect(getTagClass('spelling')).toBe('error-spelling')
    })

    it('returns error-vocab for vocabulary', () => {
      expect(getTagClass('vocabulary')).toBe('error-vocab')
    })

    it('returns empty string for unknown type', () => {
      expect(getTagClass('unknown')).toBe('')
    })
  })

  describe('corrections display', () => {
    it('detects when corrections are present', () => {
      expect(hasCorrections(mockReview)).toBe(true)
    })

    it('detects when no corrections present', () => {
      const emptyReview: Review = { ...mockReview, corrections: [], stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 } }
      expect(hasCorrections(emptyReview)).toBe(false)
    })

    it('corrections include reference_link for grammar type', () => {
      const grammarCorrection = mockReview.corrections.find(c => c.type === 'grammar')
      expect(grammarCorrection?.reference_link).toBeDefined()
      expect(grammarCorrection?.reference_link).toContain('http')
    })

    it('corrections may omit reference_link for non-grammar types', () => {
      const vocabCorrection = mockReview.corrections.find(c => c.type === 'vocabulary')
      expect(vocabCorrection?.reference_link).toBeUndefined()
    })
  })

  describe('stats display', () => {
    it('formats stats correctly', () => {
      const result = formatStats(mockReview)
      expect(result).toContain('1 grammar')
      expect(result).toContain('0 spelling')
      expect(result).toContain('1 vocabulary')
    })

    it('total_errors matches sum of individual counts', () => {
      const { stats } = mockReview
      expect(stats.total_errors).toBe(stats.grammar + stats.spelling + stats.vocabulary)
    })
  })

  describe('CEFR level display', () => {
    it('formats confidence correctly', () => {
      expect(formatConfidence(mockReview.cefrLevel.confidence)).toBe('78% confidence')
    })

    it('estimated level is a valid CEFR level', () => {
      const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
      expect(validLevels).toContain(mockReview.cefrLevel.estimated)
    })

    it('recommendations have required fields', () => {
      const rec = mockReview.cefrLevel.recommendations[0]
      expect(rec.area).toBeDefined()
      expect(rec.suggestion).toBeDefined()
      expect(Array.isArray(rec.examples)).toBe(true)
    })
  })

  describe('corrected text', () => {
    it('review exposes corrected_text', () => {
      expect(mockReview.corrected_text).toBe('Ho mangiato una mela.')
    })
  })
})
