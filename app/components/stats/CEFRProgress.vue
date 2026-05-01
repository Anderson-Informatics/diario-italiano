<template>
  <section
    class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
  >
    <h2 class="text-lg font-semibold text-gray-900 mb-4">CEFR Progress</h2>

    <div class="flex items-center justify-between mb-3">
      <p class="text-sm text-gray-600">Current level</p>
      <p class="text-xl font-semibold text-indigo-700">{{ currentLevel }}</p>
    </div>

    <div class="flex items-center justify-between mb-3 text-sm text-gray-600">
      <span>Confidence</span>
      <span>{{ currentConfidence }}%</span>
    </div>
    <div class="h-3 rounded-full bg-gray-100 mb-4">
      <div
        class="h-3 rounded-full bg-indigo-500"
        :style="{ width: `${Math.min(currentConfidence, 100)}%` }"
      />
    </div>

    <p class="text-sm text-gray-600">
      Previous level:
      <span class="font-medium text-gray-800">{{ previousLevel }}</span>
      <span
        class="ml-2"
        :class="delta >= 0 ? 'text-green-700' : 'text-red-700'"
      >
        {{ delta >= 0 ? "+" : "" }}{{ delta }} step(s)
      </span>
    </p>
  </section>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentLevel: string;
  previousLevel: string;
  currentConfidence: number;
  delta: number;
}>();
</script>
