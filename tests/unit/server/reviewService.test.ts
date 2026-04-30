import { describe, expect, it, vi } from 'vitest'
import { generateReview, MAX_REVIEW_TEXT_LENGTH, ReviewError } from '../../../server/utils/review'

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
    confidence: 82,
    recommendations: [
      {
        area: 'Passato prossimo',
        suggestion: 'Practice auxiliary verbs.',
        examples: ['Ho mangiato una mela.']
      }
    ]
  }
}

function createClient(responseContent?: string, shouldReject = false) {
  return {
    chat: {
      completions: {
        create: shouldReject
          ? vi.fn().mockRejectedValue(new Error('OpenAI unavailable'))
          : vi.fn().mockResolvedValue({
              choices: [{ message: { content: responseContent ?? JSON.stringify(mockReview) } }]
            })
      }
    }
  } as any
}

describe('review service', () => {
  it('returns parsed review for valid OpenAI response', async () => {
    const client = createClient()

    const result = await generateReview('Ho mangiata una mela.', {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      client
    })

    expect(result.corrected_text).toBe('Ho mangiato una mela.')
    expect(client.chat.completions.create).toHaveBeenCalledOnce()
  })

  it('rejects empty text', async () => {
    await expect(
      generateReview('', { apiKey: 'test-key', model: 'gpt-4o-mini', client: createClient() })
    ).rejects.toMatchObject<Partial<ReviewError>>({ statusCode: 400, message: 'text is required' })
  })

  it('rejects oversized text', async () => {
    await expect(
      generateReview('a'.repeat(MAX_REVIEW_TEXT_LENGTH + 1), {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        client: createClient()
      })
    ).rejects.toMatchObject<Partial<ReviewError>>({ statusCode: 400 })
  })

  it('rejects when API key is missing', async () => {
    await expect(
      generateReview('Ciao', { apiKey: '', model: 'gpt-4o-mini', client: createClient() })
    ).rejects.toMatchObject<Partial<ReviewError>>({
      statusCode: 503,
      message: 'AI review service is not configured'
    })
  })

  it('rejects when OpenAI call fails', async () => {
    await expect(
      generateReview('Ciao', {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        client: createClient(undefined, true)
      })
    ).rejects.toMatchObject<Partial<ReviewError>>({
      statusCode: 503,
      message: 'AI review service is unavailable'
    })
  })

  it('rejects empty OpenAI response', async () => {
    await expect(
      generateReview('Ciao', {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        client: createClient('')
      })
    ).rejects.toMatchObject<Partial<ReviewError>>({
      statusCode: 502,
      message: 'AI service returned an empty response'
    })
  })

  it('rejects invalid JSON', async () => {
    await expect(
      generateReview('Ciao', {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        client: createClient('not-json')
      })
    ).rejects.toMatchObject<Partial<ReviewError>>({
      statusCode: 502,
      message: 'AI service returned an invalid response'
    })
  })

  it('rejects unexpected response shape', async () => {
    await expect(
      generateReview('Ciao', {
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
        client: createClient(JSON.stringify({ corrected_text: 'ciao' }))
      })
    ).rejects.toMatchObject<Partial<ReviewError>>({
      statusCode: 502,
      message: 'AI service returned an unexpected response structure'
    })
  })
})