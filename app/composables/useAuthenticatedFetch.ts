export async function useAuthenticatedFetch<T>(url: string, options: Parameters<typeof $fetch<T>>[1] = {}) {
  const authStore = useAuthStore()

  if (!authStore.token && import.meta.client) {
    authStore.loadFromStorage()
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