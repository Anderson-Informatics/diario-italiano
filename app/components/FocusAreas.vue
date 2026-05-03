<template>
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-4">🎯 Focus Areas</h3>
    <p v-if="focusPeriodLabel" class="text-xs text-gray-500 -mt-2 mb-4">
      {{ focusPeriodLabel }}
    </p>
    <p v-if="focusAreas.length === 0" class="text-sm text-gray-500 mb-4">
      Complete a few reviewed entries to unlock your personalized focus areas.
    </p>
    <div v-else class="space-y-3 sm:space-y-4">
      <div v-for="area in focusAreas" :key="area.name">
        <div class="flex justify-between mb-1">
          <span class="text-sm font-medium text-gray-700">{{ area.name }}</span>
          <span class="text-sm text-gray-500">{{ area.percentage }}%</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-2">
          <div
            class="h-2 rounded-full transition-all duration-500"
            :class="getColorClass(area.color)"
            :style="{ width: `${area.percentage}%` }"
          />
        </div>
      </div>
    </div>

    <!-- CEFR Level Badge -->
    <div class="mt-4 p-3 bg-blue-50 rounded-lg">
      <span class="text-sm font-medium text-blue-800">CEFR Level: </span>
      <span class="text-sm font-bold text-blue-600 break-words"
        >{{ cefrLevel }} ({{ confidence }}% confidence)</span
      >
    </div>
  </div>
</template>

<script setup lang="ts">
interface FocusArea {
  name: string;
  percentage: number;
  color: "blue" | "purple" | "green";
}

interface Props {
  focusAreas?: FocusArea[];
  cefrLevel?: string;
  confidence?: number;
  focusPeriodLabel?: string;
}

withDefaults(defineProps<Props>(), {
  focusAreas: () => [
    { name: "Passato Prossimo", percentage: 40, color: "blue" },
    { name: "Congiuntivo", percentage: 30, color: "purple" },
    { name: "Vocabulary", percentage: 30, color: "green" },
  ],
  cefrLevel: "B1",
  confidence: 85,
  focusPeriodLabel: "",
});

const getColorClass = (color: string) => {
  const classes = {
    blue: "bg-blue-600",
    purple: "bg-purple-600",
    green: "bg-green-600",
  };
  return classes[color as keyof typeof classes] || "bg-gray-600";
};
</script>
