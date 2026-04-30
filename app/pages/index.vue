<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navigation for landing page -->
    <nav class="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-red-500 rounded-lg flex items-center justify-center">
              <span class="text-lg">🇮🇹</span>
            </div>
            <span class="text-xl font-semibold text-gray-800">Italian Daily Journal</span>
          </div>
          <div class="flex items-center space-x-4">
            <NuxtLink to="/login" class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors">
              Sign In
            </NuxtLink>
            <NuxtLink to="/register" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Get Started
            </NuxtLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <main class="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div class="max-w-4xl mx-auto text-center">
        <div class="space-y-8">
          <!-- Main Heading -->
          <div class="space-y-4">
            <h1 class="text-5xl sm:text-6xl font-bold text-gray-900">
              Master Italian, One Day at a Time
            </h1>
            <p class="text-xl sm:text-2xl text-gray-600 max-w-2xl mx-auto">
              Your personal Italian journal with AI-powered language review. Write daily, get instant feedback, and track your progress.
            </p>
          </div>

          <!-- Features -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Daily Journaling</h3>
              <p class="text-gray-600">Write in Italian every day and build a consistent writing habit.</p>
            </div>

            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0110 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">AI Review</h3>
              <p class="text-gray-600">Get intelligent grammar, spelling, and vocabulary corrections with helpful tips.</p>
            </div>

            <div class="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6a2 2 0 002-2v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Track Progress</h3>
              <p class="text-gray-600">Visualize your improvement with statistics and a calendar view of your entries.</p>
            </div>
          </div>

          <!-- Call to Action -->
          <div class="pt-8">
            <NuxtLink to="/register" class="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl">
              Start Your Italian Journey
              <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </NuxtLink>
            <p class="mt-4 text-gray-500">
              Already have an account?
              <NuxtLink to="/login" class="text-blue-600 hover:text-blue-700 font-medium"> Sign in here</NuxtLink>
            </p>
          </div>
        </div>
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
definePageMeta({
  layout: 'landing'
})
</script>