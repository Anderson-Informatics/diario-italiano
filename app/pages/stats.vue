<template>
  <div class="space-y-4 sm:space-y-6">
    <section
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
    >
      <div>
        <h1 class="text-xl sm:text-2xl font-semibold text-gray-900">
          Learning Insights
        </h1>
        <p class="text-sm text-gray-500">
          Track weekly and monthly progress from your AI review data.
        </p>
      </div>

      <div
        class="flex w-full sm:w-auto rounded-lg border border-gray-200 bg-white p-1 shadow-sm"
      >
        <button
          v-for="option in ranges"
          :key="option.value"
          class="min-h-11 flex-1 sm:flex-none px-3 py-2 text-sm font-medium rounded-md transition-colors"
          :class="
            range === option.value
              ? 'bg-blue-600 text-white'
              : 'text-gray-700 hover:bg-gray-50'
          "
          @click="setRange(option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </section>

    <section
      v-if="pending"
      class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm text-gray-600"
    >
      Loading stats dashboard...
    </section>

    <section
      v-else-if="error"
      class="bg-red-50 rounded-xl border border-red-100 p-4 sm:p-6 shadow-sm text-red-700"
    >
      {{ errorMessage }}
    </section>

    <template v-else-if="dashboard">
      <section
        v-if="!dashboard.hasEnoughData"
        class="bg-amber-50 rounded-xl border border-amber-100 p-4 sm:p-5 text-amber-800"
      >
        Add at least 3 reviewed entries to unlock reliable trend and
        recommendation insights.
      </section>

      <StatsSummaryCards :summary="dashboard.summary" />

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <div class="xl:col-span-2 space-y-4 sm:space-y-6">
          <StatsChart
            :trend="dashboard.errorTrend"
            :distribution="dashboard.errorDistribution"
          />
          <TipPanel
            :tips="dashboard.tips"
            @save="saveTip"
            @remove="removeTip"
          />
        </div>

        <div class="space-y-4 sm:space-y-6">
          <CEFRProgress
            :current-level="dashboard.monthlySummary.cefrCurrent"
            :previous-level="dashboard.monthlySummary.cefrPrevious"
            :current-confidence="currentConfidence"
            :delta="dashboard.monthlySummary.cefrDelta"
          />
          <FocusRecommendations
            :recommendations="dashboard.focusRecommendations"
          />

          <section
            class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
          >
            <h2 class="text-lg font-semibold text-gray-900 mb-3">Saved Tips</h2>
            <p
              v-if="dashboard.savedTips.length === 0"
              class="text-sm text-gray-500"
            >
              Save tips from the panel to revisit them here.
            </p>
            <ul v-else class="space-y-2 text-sm text-gray-700">
              <li
                v-for="tip in dashboard.savedTips"
                :key="tip.tipId"
                class="border border-gray-100 rounded-md p-3"
              >
                {{ tip.tip }}
              </li>
            </ul>
          </section>

          <section
            class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
          >
            <h2 class="text-lg font-semibold text-gray-900 mb-3">
              Writing Consistency
            </h2>
            <p class="text-sm text-gray-600">
              {{ dashboard.consistency.datesWithEntries.length }} active writing
              day(s) in this range.
            </p>
            <p class="text-sm text-gray-600 mt-2">
              Current streak:
              <span class="font-medium text-gray-800">{{
                dashboard.summary.currentStreak
              }}</span>
            </p>
          </section>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: "auth",
});

const ranges = [
  { label: "Week", value: "week" as const },
  { label: "Month", value: "month" as const },
  { label: "All time", value: "all" as const },
];

const {
  range,
  data: dashboard,
  pending,
  error,
  setRange,
  saveTip,
  removeTip,
} = useStats();

const currentConfidence = computed(() => {
  if (!dashboard.value || dashboard.value.cefrProgression.length === 0) {
    return 0;
  }

  return dashboard.value.cefrProgression.at(-1)?.confidence ?? 0;
});

const errorMessage = computed(() => {
  return (
    (error.value as { data?: { message?: string } } | null)?.data?.message ||
    "Unable to load dashboard data."
  );
});
</script>
