<template>
  <div class="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50">
    <!-- Navigation -->
    <nav class="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-red-500 rounded-lg flex items-center justify-center">
              <span class="text-lg">🇮🇹</span>
            </div>
            <span class="text-xl font-semibold text-gray-800">Italian Daily Journal</span>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 flex items-start justify-center pt-16 px-4 sm:px-6 lg:px-8">
      <div class="max-w-md w-full space-y-6">
        <div>
          <h2 class="text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p class="mt-2 text-center text-sm text-gray-600">
            Or
            <NuxtLink to="/register" class="font-medium text-blue-600 hover:text-blue-500">
              create a new account
            </NuxtLink>
          </p>
        </div>
        
        <form class="space-y-6" @submit.prevent="handleLogin">
          <div class="space-y-4">
            <div>
              <label for="usernameOrEmail" class="block text-sm font-medium text-gray-700">Username or Email</label>
              <input
                id="usernameOrEmail"
                v-model="form.usernameOrEmail"
                type="text"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                :class="{ 'border-red-500': errors.usernameOrEmail }"
              />
              <p v-if="errors.usernameOrEmail" class="mt-1 text-sm text-red-600">{{ errors.usernameOrEmail }}</p>
            </div>
            
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">Password</label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                :class="{ 'border-red-500': errors.password }"
              />
              <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
            </div>
          </div>

          <div v-if="serverError" class="text-sm text-red-600 text-center">
            {{ serverError }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Signing in...</span>
            <span v-else>Sign in</span>
          </button>
        </form>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-8">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
        <p>© 2026 Italian Daily Journal. Build your Italian writing skills daily.</p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'

definePageMeta({
  layout: 'landing'
})

const form = reactive({
  usernameOrEmail: '',
  password: ''
})

const errors = reactive({
  usernameOrEmail: '',
  password: ''
})

const isLoading = ref(false)
const serverError = ref('')

const authStore = useAuthStore()

const validateForm = () => {
  let isValid = true
  
  // Reset errors
  errors.usernameOrEmail = ''
  errors.password = ''
  
  if (!form.usernameOrEmail) {
    errors.usernameOrEmail = 'Username or email is required'
    isValid = false
  }
  
  if (!form.password) {
    errors.password = 'Password is required'
    isValid = false
  }
  
  return isValid
}

const handleLogin = async () => {
  if (!validateForm()) return
  
  isLoading.value = true
  serverError.value = ''
  
  try {
    const response = await $fetch<{ token: string; user: { id: string; username: string; email: string; timezone: string } }>('/api/auth/login', {
      method: 'POST',
      body: {
        usernameOrEmail: form.usernameOrEmail,
        password: form.password
      }
    })
    
    authStore.setUser(response.user, response.token)
    navigateTo('/dashboard')
  } catch (error: any) {
    serverError.value = error.data?.message || 'Login failed'
  } finally {
    isLoading.value = false
  }
}
</script>