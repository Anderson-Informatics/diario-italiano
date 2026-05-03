import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ReviewResults from '../../../app/components/ReviewResults.vue'

const mockReview = {
  corrected_text: 'Ho mangiato una mela.',
  corrections: [
    {
      original: 'mangiata',
      corrected: 'mangiato',
      type: 'grammar' as const,
      tip: 'Use the correct participle.',
      reference_link: 'https://example.com/grammar'
    }
  ],
  stats: {
    total_errors: 1,
    grammar: 1,
    spelling: 0,
    vocabulary: 0
  },
  cefrLevel: {
    estimated: 'A2' as const,
    confidence: 77,
    recommendations: [
      {
        area: 'Passato prossimo',
        suggestion: 'Practice auxiliary verbs.',
        examples: ['Ho mangiato una mela.']
      }
    ]
  },
  writing: {
    phase: 'A1-A2' as const,
    strengths: ['Your message is easy to understand.', 'You used a complete thought.'],
    priorities: [
      {
        title: 'Verb form',
        detail: 'Use the past participle mangiato after ho.'
      }
    ],
    dimensionScores: [
      {
        dimension: 'grammarControl' as const,
        score: 3,
        rationale: 'The structure is mostly clear, but the verb ending is incorrect.'
      }
    ],
    modelRewrite: 'Ho mangiato una mela.',
    followUpTask: {
      prompt: 'Write two more passato prossimo sentences.',
      instructions: 'Use ho or sono correctly in both.'
    }
  }
}

describe('ReviewResults rendering', () => {
  beforeEach(() => {
    vi.stubGlobal('ref', ref)
  })

  it('renders loading state', () => {
    const wrapper = mount(ReviewResults, {
      props: { isLoading: true }
    })

    expect(wrapper.find('.proof-loader').exists()).toBe(true)
  })

  it('renders error state', () => {
    const wrapper = mount(ReviewResults, {
      props: { errorMessage: 'AI review failed' }
    })

    expect(wrapper.text()).toContain('AI review failed')
  })

  it('shows original text by default and corrected text after tab switch', async () => {
    const wrapper = mount(ReviewResults, {
      props: {
        originalText: 'Ho mangiata una mela.',
        review: mockReview
      }
    })

    expect(wrapper.get('p.whitespace-pre-wrap').text()).toBe('Ho mangiata una mela.')

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.get('p.whitespace-pre-wrap').text()).toBe('Ho mangiato una mela.')
  })

  it('renders correction link with new-tab security attributes', () => {
    const wrapper = mount(ReviewResults, {
      props: {
        originalText: 'Ho mangiata una mela.',
        review: mockReview
      }
    })

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('https://example.com/grammar')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer')
  })

  it('renders CEFR and stats details', () => {
    const wrapper = mount(ReviewResults, {
      props: {
        originalText: 'Ho mangiata una mela.',
        review: mockReview
      }
    })

    expect(wrapper.text()).toContain('Estimated CEFR Level')
    expect(wrapper.text()).toContain('A2')
    expect(wrapper.text()).toContain('77% confidence')
    expect(wrapper.text()).toContain('(1 total)')
  })

  it('renders optional writing feedback sections', () => {
    const wrapper = mount(ReviewResults, {
      props: {
        originalText: 'Ho mangiata una mela.',
        review: mockReview
      }
    })

    expect(wrapper.text()).toContain('Writing feedback')
    expect(wrapper.text()).toContain('Phase A1-A2')
    expect(wrapper.text()).toContain('Priority improvements')
    expect(wrapper.text()).toContain('Verb form')
    expect(wrapper.text()).toContain('Follow-up task')
  })

  it('keeps rendering legacy reviews without writing feedback', () => {
    const legacyReview = { ...mockReview }
    delete legacyReview.writing

    const wrapper = mount(ReviewResults, {
      props: {
        originalText: 'Ho mangiata una mela.',
        review: legacyReview
      }
    })

    expect(wrapper.text()).not.toContain('Writing feedback')
    expect(wrapper.text()).toContain('Estimated CEFR Level')
  })
})