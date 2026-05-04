<template>
  <section
    class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
  >
    <h2 class="text-lg font-semibold text-gray-900 mb-4">
      Progress Visualization
    </h2>

    <div class="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-8">
      <div>
        <h3 class="text-sm font-medium text-gray-700 mb-3">Error Rate Trend (per 100 words)</h3>
        <svg viewBox="0 0 320 140" class="w-full h-40 bg-gray-50 rounded-lg">
          <polyline
            fill="none"
            stroke="#2563eb"
            stroke-width="3"
            :points="linePoints"
          />
          <circle
            v-for="point in normalizedTrend"
            :key="point.date"
            :cx="point.x"
            :cy="point.y"
            r="3"
            fill="#1d4ed8"
          />
        </svg>
      </div>

      <div>
        <h3 class="text-sm font-medium text-gray-700 mb-3">
          Error Type Distribution
        </h3>
        <div class="space-y-3">
          <div v-for="bar in bars" :key="bar.key">
            <div class="flex justify-between text-sm text-gray-700 mb-1">
              <span>{{ bar.label }}</span>
              <span>{{ bar.value }}</span>
            </div>
            <div class="h-3 rounded-full bg-gray-100">
              <div
                class="h-3 rounded-full"
                :class="bar.color"
                :style="{ width: bar.width }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ErrorDistribution, ErrorTrendPoint } from "../../types";

const props = defineProps<{
  trend: ErrorTrendPoint[];
  distribution: ErrorDistribution;
}>();

const normalizedTrend = computed(() => {
  if (props.trend.length === 0) {
    return [];
  }

  const maxValue = Math.max(...props.trend.map((item) => item.error_rate), 1);
  const horizontalStep =
    props.trend.length > 1 ? 280 / (props.trend.length - 1) : 0;

  return props.trend.map((point, index) => {
    const x = 20 + index * horizontalStep;
    const y = 120 - (point.error_rate / maxValue) * 100;

    return {
      date: point.date,
      x,
      y,
    };
  });
});

const linePoints = computed(() =>
  normalizedTrend.value.map((point) => `${point.x},${point.y}`).join(" "),
);

const bars = computed(() => {
  const total = Math.max(props.distribution.total, 1);

  return [
    {
      key: "grammar",
      label: "Grammar",
      value: props.distribution.grammar,
      width: `${Math.round((props.distribution.grammar / total) * 100)}%`,
      color: "bg-blue-500",
    },
    {
      key: "spelling",
      label: "Spelling",
      value: props.distribution.spelling,
      width: `${Math.round((props.distribution.spelling / total) * 100)}%`,
      color: "bg-emerald-500",
    },
    {
      key: "vocabulary",
      label: "Vocabulary",
      value: props.distribution.vocabulary,
      width: `${Math.round((props.distribution.vocabulary / total) * 100)}%`,
      color: "bg-amber-500",
    },
    {
      key: "punctuation",
      label: "Punctuation",
      value: props.distribution.punctuation ?? 0,
      width: `${Math.round(((props.distribution.punctuation ?? 0) / total) * 100)}%`,
      color: "bg-purple-500",
    },
  ];
});
</script>
