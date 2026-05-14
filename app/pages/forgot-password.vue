<template>
  <div
    class="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-white to-indigo-50"
  >
    <nav class="bg-white/80 backdrop-blur-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between items-center h-16">
          <div class="flex items-center space-x-3">
            <div
              class="w-10 h-10 bg-gradient-to-br from-green-500 via-white to-red-500 rounded-lg flex items-center justify-center"
            >
              <span class="text-lg">🇮🇹</span>
            </div>
            <span class="text-xl font-semibold text-gray-800"
              >Italian Daily Journal</span
            >
          </div>
        </div>
      </div>
    </nav>

    <main
      class="flex-1 flex items-start justify-center pt-16 px-4 sm:px-6 lg:px-8"
    >
      <div class="max-w-md w-full space-y-6">
        <div>
          <h1 class="text-center text-3xl font-extrabold text-gray-900">
            Reset your password
          </h1>
          <p class="mt-2 text-center text-sm text-gray-600">
            Enter your email and we will send you a reset link.
          </p>
        </div>

        <form class="space-y-6" @submit.prevent="handleForgotPassword">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700"
              >Email</label
            >
            <input
              id="email"
              v-model="form.email"
              type="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              :class="{ 'border-red-500': errors.email }"
            />
            <p v-if="errors.email" class="mt-1 text-sm text-red-600">
              {{ errors.email }}
            </p>
          </div>

          <div
            v-if="successMessage"
            class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            {{ successMessage }}
          </div>

          <div
            v-if="devResetUrl"
            class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
          >
            Dev reset link:
            <NuxtLink class="font-medium underline" :to="devResetUrl">
              Open reset page
            </NuxtLink>
          </div>

          <div v-if="serverError" class="text-sm text-red-600 text-center">
            {{ serverError }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Sending reset link...</span>
            <span v-else>Send reset link</span>
          </button>

          <p class="text-center text-sm text-gray-600">
            <NuxtLink
              to="/login"
              class="font-medium text-blue-600 hover:text-blue-500"
            >
              Back to sign in
            </NuxtLink>
          </p>
        </form>
      </div>
    </main>

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

const form = reactive({
  email: "",
});

const errors = reactive({
  email: "",
});

const isLoading = ref(false);
const serverError = ref("");
const successMessage = ref("");
const devResetUrl = ref("");

const validateForm = () => {
  errors.email = "";

  if (!form.email) {
    errors.email = "Email is required";
    return false;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = "Please enter a valid email";
    return false;
  }

  return true;
};

const handleForgotPassword = async () => {
  if (!validateForm()) {
    return;
  }

  isLoading.value = true;
  serverError.value = "";
  successMessage.value = "";
  devResetUrl.value = "";

  try {
    const response = await $fetch<{ message: string; resetUrl?: string }>(
      "/api/auth/forgot-password",
      {
        method: "POST",
        body: {
          email: form.email,
        },
      },
    );

    successMessage.value = response.message;
    devResetUrl.value = response.resetUrl ?? "";
  } catch (error: any) {
    serverError.value =
      error.data?.message || "Unable to process this request right now";
  } finally {
    isLoading.value = false;
  }
};
</script>
