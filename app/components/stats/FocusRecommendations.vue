<template>
  <section
    class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
  >
    <h2 class="text-lg font-semibold text-gray-900 mb-4">
      Focus Recommendations
    </h2>

    <p v-if="recommendations.length === 0" class="text-sm text-gray-500">
      No recurring patterns yet. Keep writing to unlock tailored
      recommendations.
    </p>

    <ul v-else class="space-y-3 sm:space-y-4">
      <li
        v-for="item in recommendations"
        :key="item.area"
        class="border border-gray-100 rounded-lg p-3 sm:p-4"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-gray-900">{{ item.area }}</h3>
          <span class="text-xs text-gray-500"
            >{{ item.errorCount }} recurring errors</span
          >
        </div>
        <p class="text-sm text-gray-700 mt-2">{{ item.suggestion }}</p>
        <ul class="mt-2 text-xs text-gray-600 list-disc list-inside">
          <li v-for="example in item.examples" :key="example">{{ example }}</li>
        </ul>
        <a
          :href="item.resourceLink"
          target="_blank"
          rel="noreferrer"
          class="inline-block mt-3 text-xs text-blue-700 hover:text-blue-900"
        >
          Open study resource
        </a>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { FocusRecommendation } from "../../types";

defineProps<{
  recommendations: FocusRecommendation[];
}>();
</script>
