import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const authenticatedFetchMock = vi.fn()

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  vi.stubGlobal('ref', ref)
  vi.stubGlobal('useAuthenticatedFetch', authenticatedFetchMock)
})

describe('useReview', () => {
  it('stores review data on success', async () => {
    const reviewPayload = {
      corrected_text: 'Ho mangiato una mela.',
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'A2', confidence: 76, recommendations: [] }
    }
    authenticatedFetchMock.mockResolvedValue(reviewPayload)

    const { useReview } = await import('../../../app/composables/useReview')
    const { review, isLoading, error, requestReview } = useReview()

    const promise = requestReview('Ho mangiata una mela.')
    expect(isLoading.value).toBe(true)

    const result = await promise

    expect(result).toEqual(reviewPayload)
    expect(review.value).toEqual(reviewPayload)
    expect(error.value).toBeNull()
    expect(isLoading.value).toBe(false)
    expect(authenticatedFetchMock).toHaveBeenCalledWith('/api/review', {
      method: 'POST',
      body: { text: 'Ho mangiata una mela.' }
    })
  })

  it('exposes API error messages on failure', async () => {
    authenticatedFetchMock.mockRejectedValue({ data: { message: 'AI review service is unavailable' } })

    const { useReview } = await import('../../../app/composables/useReview')
    const { review, isLoading, error, requestReview } = useReview()

    const result = await requestReview('Ciao')

    expect(result).toBeNull()
    expect(review.value).toBeNull()
    expect(error.value).toBe('AI review service is unavailable')
    expect(isLoading.value).toBe(false)
  })

  it('clearReview resets review and error state', async () => {
    authenticatedFetchMock.mockResolvedValue({
      corrected_text: 'Ciao',
      corrections: [],
      stats: { total_errors: 0, grammar: 0, spelling: 0, vocabulary: 0 },
      cefrLevel: { estimated: 'A1', confidence: 90, recommendations: [] }
    })

    const { useReview } = await import('../../../app/composables/useReview')
    const { review, error, requestReview, clearReview } = useReview()

    await requestReview('Ciao')
    error.value = 'Some old error'
    clearReview()

    expect(review.value).toBeNull()
    expect(error.value).toBeNull()
  })
})