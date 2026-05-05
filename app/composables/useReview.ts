import type { Review, WritingReviewPhase } from '../types/index'

interface RequestReviewOptions {
  learnerPhase?: WritingReviewPhase
}

export function useReview() {
  const review = ref<Review | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  function getReviewErrorMessage(err: unknown): string {
    const fallback = 'Review failed. Please try again.'

    if (!err || typeof err !== 'object') {
      return fallback
    }

    const payload = err as {
      data?: { message?: string; statusMessage?: string }
      statusMessage?: string
      message?: string
    }

    return (
      payload.data?.message ??
      payload.data?.statusMessage ??
      payload.statusMessage ??
      payload.message ??
      fallback
    )
  }

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
      error.value = getReviewErrorMessage(err)
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
