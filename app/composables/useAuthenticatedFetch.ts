export async function useAuthenticatedFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const authStore = useAuthStore()
  const isProtectedApiRoute = url.startsWith('/api/') && !url.startsWith('/api/auth/')

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

  return $fetch<T>(url, {
    ...options,
    headers
  })
}