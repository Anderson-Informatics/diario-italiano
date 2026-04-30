<template>
  <div class="space-y-6">
    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h1 class="text-2xl font-semibold text-gray-900">Profile & Settings</h1>
      <p class="text-sm text-gray-500 mt-1">Manage your account information.</p>
    </section>

    <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div v-if="pending" class="text-sm text-gray-500">Loading profile...</div>

      <div v-else-if="error" class="text-sm text-red-600">
        {{ errorMessage }}
      </div>

      <dl v-else-if="resolvedUser" class="space-y-4">
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
            Username
          </dt>
          <dd class="text-base text-gray-900">{{ resolvedUser.username }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-gray-500">
            Email
          </dt>
          <dd class="text-base text-gray-900">{{ resolvedUser.email }}</dd>
        </div>
      </dl>

      <div class="mt-6 flex gap-3">
        <button
          class="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
          @click="refresh()"
        >
          Refresh
        </button>
        <button
          class="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

interface ProfileUser {
  id: string;
  username: string;
  email: string;
}

const authStore = useAuthStore();

const { data, pending, error, refresh } = await useAsyncData(
  "profile-user",
  async () => {
    if (!import.meta.client) {
      return null;
    }

    const response = await useAuthenticatedFetch<{ user: ProfileUser | null }>(
      "/api/auth/verify",
    );
    return response.user;
  },
);

const resolvedUser = computed(() => {
  return data.value ?? authStore.user;
});

const errorMessage = computed(() => {
  return (
    (error.value as { data?: { message?: string } } | null)?.data?.message ??
    "Unable to load profile."
  );
});

const handleLogout = () => {
  authStore.logout();
  navigateTo("/login");
};
</script>
