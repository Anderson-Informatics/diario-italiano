<template>
  <div class="min-h-screen flex flex-col">
    <!-- Navigation for landing page -->
    <nav
      class="bg-white/90 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40"
    >
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3 min-w-0">
            <div
              class="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-red-500 rounded-lg flex items-center justify-center"
            >
              <span class="text-lg">🇮🇹</span>
            </div>
            <span
              class="text-base sm:text-xl font-semibold text-gray-800 truncate"
              >Italian Daily Journal</span
            >
          </div>

          <div class="hidden sm:flex items-center space-x-4">
            <NuxtLink
              to="/login"
              class="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg transition-colors"
            >
              Sign In
            </NuxtLink>
            <NuxtLink
              to="/register"
              class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </NuxtLink>
          </div>

          <button
            type="button"
            class="sm:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
            @click="showMobileNav = !showMobileNav"
            aria-label="Toggle site navigation"
            :aria-expanded="showMobileNav"
          >
            <svg
              v-if="!showMobileNav"
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <svg
              v-else
              class="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <transition
          enter-from-class="opacity-0 -translate-y-1"
          enter-active-class="transition ease-out duration-150"
          enter-to-class="opacity-100 translate-y-0"
          leave-from-class="opacity-100 translate-y-0"
          leave-active-class="transition ease-in duration-100"
          leave-to-class="opacity-0 -translate-y-1"
        >
          <div
            v-if="showMobileNav"
            class="sm:hidden pb-4 border-t border-gray-100"
          >
            <div class="flex flex-col gap-2 pt-3">
              <NuxtLink
                to="/login"
                class="px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
                @click="showMobileNav = false"
              >
                Sign In
              </NuxtLink>
              <NuxtLink
                to="/register"
                class="px-4 py-3 text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700"
                @click="showMobileNav = false"
              >
                Get Started
              </NuxtLink>
            </div>
          </div>
        </transition>
      </div>
    </nav>

    <!-- Hero Section -->
    <main class="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-16">
      <div class="max-w-4xl mx-auto text-center">
        <div class="space-y-6 sm:space-y-8">
          <!-- Main Heading -->
          <div class="space-y-3 sm:space-y-4">
            <h1
              class="text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900"
            >
              Master Italian, One Day at a Time
            </h1>
            <p
              class="text-base sm:text-xl lg:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
            >
              Your personal Italian journal with AI-powered language review.
              Write daily, get instant feedback, and track your progress.
            </p>
          </div>

          <!-- Features -->
          <div
            class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 pt-4 sm:pt-8"
          >
            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div
                class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  class="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Daily Journaling
              </h3>
              <p class="text-gray-600">
                Write in Italian every day and build a consistent writing habit.
              </p>
            </div>

            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div
                class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  class="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0110 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                AI Review
              </h3>
              <p class="text-gray-600">
                Get intelligent grammar, spelling, and vocabulary corrections
                with helpful tips.
              </p>
            </div>

            <div
              class="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
            >
              <div
                class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4"
              >
                <svg
                  class="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6a2 2 0 002-2v-5a2 2 0 00-2-2h-2a2 2 0 00-2 2v5a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 mb-2">
                Track Progress
              </h3>
              <p class="text-gray-600">
                Visualize your improvement with statistics and a calendar view
                of your entries.
              </p>
            </div>
          </div>

          <!-- Call to Action -->
          <div class="pt-2 sm:pt-8">
            <NuxtLink
              to="/register"
              class="w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              Start Your Italian Journey
              <svg
                class="ml-2 w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </NuxtLink>
            <p class="mt-4 text-sm sm:text-base text-gray-500">
              Already have an account?
              <NuxtLink
                to="/login"
                class="text-blue-600 hover:text-blue-700 font-medium"
              >
                Sign in here</NuxtLink
              >
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="bg-white border-t border-gray-200 py-8">
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500"
      >
        <p>
          © 2026 Italian Daily Journal. Build your Italian writing skills daily.
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "landing",
});

const showMobileNav = ref(false);

const route = useRoute();

watch(
  () => route.path,
  () => {
    showMobileNav.value = false;
  },
);
</script>
