<template>
  <header class="bg-white shadow-sm border-b border-gray-200">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center h-16">
        <!-- Logo -->
        <NuxtLink to="/" class="flex items-center space-x-3 min-w-0">
          <div
            class="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-red-500 rounded-lg flex items-center justify-center"
          >
            <span class="text-lg font-bold text-blue-600">🇮🇹</span>
          </div>
          <h1 class="text-base sm:text-xl font-semibold text-gray-800 truncate">
            Italian Daily Journal
          </h1>
        </NuxtLink>

        <!-- Desktop Navigation -->
        <nav class="hidden md:flex items-center space-x-4">
          <NuxtLink
            to="/dashboard"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="
              route.path === '/dashboard'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            "
          >
            Dashboard
          </NuxtLink>
          <NuxtLink
            to="/stats"
            class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            :class="
              route.path === '/stats'
                ? 'text-blue-600 bg-blue-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            "
          >
            Stats
          </NuxtLink>

          <!-- User Menu -->
          <div class="relative" ref="menuRef">
            <button
              @click="showMenu = !showMenu"
              class="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <span class="text-sm font-medium">Menu ▼</span>
            </button>

            <!-- Dropdown Menu -->
            <transition
              enter-from-class="opacity-0 scale-95"
              enter-active-class="transition ease-out duration-100"
              enter-to-class="opacity-100 scale-100"
              leave-from-class="opacity-100 scale-100"
              leave-active-class="transition ease-in duration-75"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="showMenu"
                class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <NuxtLink
                  to="/profile"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profile/Settings
                </NuxtLink>
                <NuxtLink
                  to="/stats"
                  class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Statistics
                </NuxtLink>
                <hr class="my-1 border-gray-200" />
                <button
                  @click="handleLogout"
                  class="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                >
                  Logout
                </button>
              </div>
            </transition>
          </div>
        </nav>

        <!-- Mobile Menu Toggle -->
        <button
          type="button"
          class="md:hidden inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-700 hover:bg-gray-50"
          @click="showMobileMenu = !showMobileMenu"
          aria-label="Toggle navigation"
          :aria-expanded="showMobileMenu"
        >
          <svg
            v-if="!showMobileMenu"
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

      <!-- Mobile Navigation -->
      <transition
        enter-from-class="opacity-0 -translate-y-1"
        enter-active-class="transition ease-out duration-150"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-active-class="transition ease-in duration-100"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <nav
          v-if="showMobileMenu"
          class="md:hidden pb-4 border-t border-gray-100"
        >
          <div class="flex flex-col gap-2 pt-3">
            <NuxtLink
              to="/dashboard"
              class="px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="
                route.path === '/dashboard'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:bg-gray-50'
              "
              @click="closeAllMenus"
            >
              Dashboard
            </NuxtLink>
            <NuxtLink
              to="/stats"
              class="px-4 py-3 text-sm font-medium rounded-lg transition-colors"
              :class="
                route.path === '/stats'
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:bg-gray-50'
              "
              @click="closeAllMenus"
            >
              Stats
            </NuxtLink>
            <NuxtLink
              to="/profile"
              class="px-4 py-3 text-sm font-medium rounded-lg text-gray-700 hover:bg-gray-50"
              @click="closeAllMenus"
            >
              Profile/Settings
            </NuxtLink>
            <button
              class="w-full text-left px-4 py-3 text-sm font-medium rounded-lg text-red-600 hover:bg-red-50"
              @click="handleLogout"
            >
              Logout
            </button>
          </div>
        </nav>
      </transition>
    </div>
  </header>
</template>

<script setup lang="ts">
const route = useRoute();
const showMenu = ref(false);
const showMobileMenu = ref(false);
const menuRef = ref<HTMLElement | null>(null);
const authStore = useAuthStore();

// Close menu when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    showMenu.value = false;
  }
};

const closeAllMenus = () => {
  showMenu.value = false;
  showMobileMenu.value = false;
};

onMounted(() => {
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});

const handleLogout = () => {
  authStore.logout();
  closeAllMenus();
  navigateTo("/");
};

watch(
  () => route.path,
  () => {
    closeAllMenus();
  },
);
</script>
