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
            <dt
              class="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
              Username
            </dt>
            <dd class="text-base text-gray-900">{{ resolvedUser.username }}</dd>
          </div>
          <div>
            <dt
              class="text-xs font-medium uppercase tracking-wide text-gray-500"
            >
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
            Date-based features, including streaks and calendar days, use this
            timezone.
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
              :disabled="
                isSavingTimezone || selectedTimezone === resolvedUser.timezone
              "
              @click="saveTimezone"
            >
              {{ isSavingTimezone ? "Saving..." : "Save timezone" }}
            </button>
          </div>
          <p v-if="timezoneSuccess" class="mt-2 text-sm text-green-700">
            {{ timezoneSuccess }}
          </p>
          <p v-if="timezoneError" class="mt-2 text-sm text-red-600">
            {{ timezoneError }}
          </p>
        </div>

        <div class="border-t border-gray-100 pt-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <label
                class="block text-xs font-medium uppercase tracking-wide text-gray-500"
              >
                Review Level Preference
              </label>
              <p class="text-sm text-gray-500 mt-1">
                Use your chosen learner phase for AI writing reviews instead of
                inferring it from past entries.
              </p>
            </div>
            <label class="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                v-model="useTargetReviewPhase"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Use fixed review level
            </label>
          </div>

          <div class="mt-3 flex flex-col sm:flex-row gap-2 sm:items-center">
            <select
              v-model="selectedReviewPhase"
              class="w-full sm:max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-500"
              :disabled="!useTargetReviewPhase"
            >
              <option
                v-for="option in reviewPhaseOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            <button
              class="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              :disabled="isSavingReviewPreferences"
              @click="saveReviewPreferences"
            >
              {{
                isSavingReviewPreferences
                  ? "Saving..."
                  : "Save review preference"
              }}
            </button>
          </div>
          <p v-if="reviewPreferenceSuccess" class="mt-2 text-sm text-green-700">
            {{ reviewPreferenceSuccess }}
          </p>
          <p v-if="reviewPreferenceError" class="mt-2 text-sm text-red-600">
            {{ reviewPreferenceError }}
          </p>
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
  useTargetReviewPhase?: boolean;
  targetReviewPhase?: "A1-A2" | "B1-B2" | "C1-C2";
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
const reviewPhaseOptions = [
  { value: "A1-A2", label: "A1-A2 Foundations" },
  { value: "B1-B2", label: "B1-B2 Progressing" },
  { value: "C1-C2", label: "C1-C2 Refinement" },
] as const;
const useTargetReviewPhase = ref(false);
const selectedReviewPhase = ref<"A1-A2" | "B1-B2" | "C1-C2">("B1-B2");
const isSavingReviewPreferences = ref(false);
const reviewPreferenceSuccess = ref("");
const reviewPreferenceError = ref("");

onMounted(() => {
  const currentZone = resolvedUser.value?.timezone || "UTC";
  selectedTimezone.value = currentZone;
  useTargetReviewPhase.value = Boolean(
    resolvedUser.value?.useTargetReviewPhase,
  );
  selectedReviewPhase.value = resolvedUser.value?.targetReviewPhase || "B1-B2";

  const intlWithSupported = Intl as unknown as {
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

  useTargetReviewPhase.value = Boolean(user?.useTargetReviewPhase);
  selectedReviewPhase.value = user?.targetReviewPhase || "B1-B2";
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

const saveReviewPreferences = async () => {
  reviewPreferenceSuccess.value = "";
  reviewPreferenceError.value = "";
  isSavingReviewPreferences.value = true;

  try {
    const response = await useAuthenticatedFetch<{ user: ProfileUser }>(
      "/api/auth/profile",
      {
        method: "PUT",
        body: {
          useTargetReviewPhase: useTargetReviewPhase.value,
          targetReviewPhase: selectedReviewPhase.value,
        },
      },
    );

    data.value = response.user;
    authStore.updateUser(response.user);
    reviewPreferenceSuccess.value = "Review preferences updated successfully.";
  } catch (saveError) {
    reviewPreferenceError.value =
      (saveError as { data?: { message?: string } })?.data?.message ||
      "Failed to update review preferences.";
  } finally {
    isSavingReviewPreferences.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  navigateTo("/login");
};
</script>
