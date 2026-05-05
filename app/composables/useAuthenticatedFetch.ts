export async function useAuthenticatedFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const authStore = useAuthStore()
  const isProtectedApiRoute = url.startsWith('/api/') && !url.startsWith('/api/auth/')
  const method = typeof options?.method === 'string' ? options.method.toUpperCase() : 'GET'

  if (isProtectedApiRoute && !authStore.token && import.meta.client) {
    authStore.loadFromStorage()
  }

  if (isProtectedApiRoute && !authStore.token) {
    if (import.meta.client) {
      authStore.logout()
    }

    throw Object.assign(new Error('Authentication required'), {
      data: { message: 'Authentication required' },
      statusMessage: 'Authentication required'
    })
  }

  const headers = new Headers(options?.headers as HeadersInit | undefined)

  if (authStore.token) {
    headers.set('Authorization', `Bearer ${authStore.token}`)
  }

  try {
    return await $fetch<T>(url, {
      ...options,
      headers
    })
  } catch (error) {
    if (import.meta.client) {
      const payload = error as {
        message?: string
        name?: string
        cause?: unknown
        response?: {
          status?: number
          _data?: unknown
        }
      }

      console.error('[fetch] API request failed', {
        method,
        url,
        isProtectedApiRoute,
        hasToken: Boolean(authStore.token),
        name: payload?.name,
        message: payload?.message,
        status: payload?.response?.status,
        data: payload?.response?._data,
        cause: payload?.cause
      })
    }

    throw error
  }
}