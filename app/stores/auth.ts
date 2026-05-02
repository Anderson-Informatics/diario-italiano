import { defineStore } from 'pinia'

const AUTH_STORAGE_KEY = 'italian-journal-auth'

interface User {
  id: string
  username: string
  email: string
  timezone: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: null as string | null
  }),
  actions: {
    loadFromStorage() {
      if (!import.meta.client) {
        return
      }

      const stored = localStorage.getItem(AUTH_STORAGE_KEY)
      if (!stored) {
        return
      }

      try {
        const parsed = JSON.parse(stored) as { user: User | null; token: string | null }
        this.user = parsed.user
        this.token = parsed.token
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    },
    setUser(user: User, token: string) {
      this.user = user
      this.token = token

      if (import.meta.client) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token }))
      }
    },
    updateUser(user: User) {
      this.user = user

      if (import.meta.client) {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, token: this.token }))
      }
    },
    logout() {
      this.user = null
      this.token = null

      if (import.meta.client) {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  }
})