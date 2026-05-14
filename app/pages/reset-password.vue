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
            Set a new password
          </h1>
          <p class="mt-2 text-center text-sm text-gray-600">
            Choose a new password for your account.
          </p>
        </div>

        <div
          v-if="!token"
          class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          Reset token is missing. Request a new link from the forgot password
          page.
        </div>

        <form v-else class="space-y-6" @submit.prevent="handleResetPassword">
          <div class="space-y-4">
            <div>
              <label
                for="password"
                class="block text-sm font-medium text-gray-700"
                >New password</label
              >
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                :class="{ 'border-red-500': errors.password }"
              />
              <p v-if="errors.password" class="mt-1 text-sm text-red-600">
                {{ errors.password }}
              </p>
            </div>

            <div>
              <label
                for="confirmPassword"
                class="block text-sm font-medium text-gray-700"
                >Confirm new password</label
              >
              <input
                id="confirmPassword"
                v-model="form.confirmPassword"
                type="password"
                required
                class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                :class="{ 'border-red-500': errors.confirmPassword }"
              />
              <p
                v-if="errors.confirmPassword"
                class="mt-1 text-sm text-red-600"
              >
                {{ errors.confirmPassword }}
              </p>
            </div>
          </div>

          <div v-if="serverError" class="text-sm text-red-600 text-center">
            {{ serverError }}
          </div>

          <div
            v-if="successMessage"
            class="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800"
          >
            {{ successMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isLoading">Updating password...</span>
            <span v-else>Reset password</span>
          </button>
        </form>

        <p class="text-center text-sm text-gray-600">
          <NuxtLink
            to="/login"
            class="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to sign in
          </NuxtLink>
        </p>
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

const route = useRoute();
const token = computed(() => String(route.query.token ?? "").trim());

const form = reactive({
  password: "",
  confirmPassword: "",
});

const errors = reactive({
  password: "",
  confirmPassword: "",
});

const isLoading = ref(false);
const serverError = ref("");
const successMessage = ref("");

const validateForm = () => {
  errors.password = "";
  errors.confirmPassword = "";

  if (!form.password) {
    errors.password = "Password is required";
    return false;
  }

  if (form.password.length < 6) {
    errors.password = "Password must be at least 6 characters";
    return false;
  }

  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = "Passwords do not match";
    return false;
  }

  return true;
};

const handleResetPassword = async () => {
  if (!validateForm()) {
    return;
  }

  if (!token.value) {
    serverError.value = "Reset token is missing. Request a new reset link.";
    return;
  }

  isLoading.value = true;
  serverError.value = "";
  successMessage.value = "";

  try {
    const response = await $fetch<{ message: string }>(
      "/api/auth/reset-password",
      {
        method: "POST",
        body: {
          token: token.value,
          password: form.password,
        },
      },
    );

    successMessage.value = response.message;
    form.password = "";
    form.confirmPassword = "";

    await navigateTo("/login");
  } catch (error: any) {
    serverError.value = error.data?.message || "Unable to reset password";
  } finally {
    isLoading.value = false;
  }
};
</script>
