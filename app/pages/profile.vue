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

      <div v-else-if="resolvedUser" class="space-y-5">
        <dl class="space-y-4">
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

        <div class="border-t border-gray-100 pt-5">
          <label
            for="timezone"
            class="block text-xs font-medium uppercase tracking-wide text-gray-500"
          >
            Timezone
          </label>
          <p class="text-sm text-gray-500 mt-1">
            Date-based features, including streaks and calendar days, use this timezone.
          </p>
          <div class="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              id="timezone"
              v-model="selectedTimezone"
              class="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option v-for="zone in timezoneOptions" :key="zone" :value="zone">
                {{ zone }}
              </option>
            </select>
            <button
              class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="isSavingTimezone || selectedTimezone === resolvedUser.timezone"
              @click="saveTimezone"
            >
              {{ isSavingTimezone ? "Saving..." : "Save timezone" }}
            </button>
          </div>
          <p v-if="timezoneSuccess" class="mt-2 text-sm text-green-700">{{ timezoneSuccess }}</p>
          <p v-if="timezoneError" class="mt-2 text-sm text-red-600">{{ timezoneError }}</p>
        </div>
      </div>

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
  timezone: string;
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

const timezoneOptions = ref<string[]>(["UTC"]);
const selectedTimezone = ref("UTC");
const isSavingTimezone = ref(false);
const timezoneSuccess = ref("");
const timezoneError = ref("");

onMounted(() => {
  const currentZone = resolvedUser.value?.timezone || "UTC";
  selectedTimezone.value = currentZone;

  const intlWithSupported = Intl as Intl.DateTimeFormat & {
    supportedValuesOf?: (key: string) => string[];
  };

  if (typeof intlWithSupported.supportedValuesOf === "function") {
    const zones = intlWithSupported.supportedValuesOf("timeZone");
    timezoneOptions.value = zones.length > 0 ? zones : ["UTC"];
  } else {
    timezoneOptions.value = [
      "UTC",
      "Europe/Rome",
      "Europe/London",
      "America/New_York",
      "America/Los_Angeles",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];
  }

  if (!timezoneOptions.value.includes(currentZone)) {
    timezoneOptions.value.unshift(currentZone);
  }
});

watch(resolvedUser, (user) => {
  if (user?.timezone) {
    selectedTimezone.value = user.timezone;
  }
});

const errorMessage = computed(() => {
  return (
    (error.value as { data?: { message?: string } } | null)?.data?.message ??
    "Unable to load profile."
  );
});

const saveTimezone = async () => {
  timezoneSuccess.value = "";
  timezoneError.value = "";
  isSavingTimezone.value = true;

  try {
    const response = await useAuthenticatedFetch<{ user: ProfileUser }>(
      "/api/auth/profile",
      {
        method: "PUT",
        body: { timezone: selectedTimezone.value },
      },
    );

    data.value = response.user;
    authStore.updateUser(response.user);
    timezoneSuccess.value = "Timezone updated successfully.";
  } catch (saveError) {
    timezoneError.value =
      (saveError as { data?: { message?: string } })?.data?.message ||
      "Failed to update timezone.";
  } finally {
    isSavingTimezone.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  navigateTo("/login");
};
</script>
