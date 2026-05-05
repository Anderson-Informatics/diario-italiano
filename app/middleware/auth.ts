export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  if (!authStore.user || !authStore.token) {
    authStore.loadFromStorage()
  }

  if (!authStore.user || !authStore.token) {
    authStore.logout()
    return navigateTo('/login')
  }
})