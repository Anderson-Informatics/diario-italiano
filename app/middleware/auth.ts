export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()

  if (!authStore.user) {
    authStore.loadFromStorage()
  }
  
  if (!authStore.user) {
    return navigateTo('/login')
  }
})