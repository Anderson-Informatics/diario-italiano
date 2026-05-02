import type { Review, WritingReviewPhase } from '../types/index'

interface RequestReviewOptions {
  learnerPhase?: WritingReviewPhase
}

export function useReview() {
  const review = ref<Review | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function requestReview(text: string, options: RequestReviewOptions = {}): Promise<Review | null> {
    isLoading.value = true
    error.value = null
    review.value = null

    try {
      const data = await useAuthenticatedFetch<Review>('/api/review', {
        method: 'POST',
        body: {
          text,
          learnerPhase: options.learnerPhase
        }
      })
      review.value = data
      return data
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'data' in err
          ? ((err as { data?: { message?: string } }).data?.message ?? 'Review failed. Please try again.')
          : 'Review failed. Please try again.'
      error.value = message
      return null
    } finally {
      isLoading.value = false
    }
  }

  function clearReview() {
    review.value = null
    error.value = null
  }

  return { review, isLoading, error, requestReview, clearReview }
}
