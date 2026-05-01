<template>
  <section
    class="bg-white rounded-xl border border-gray-100 p-4 sm:p-6 shadow-sm"
  >
    <div class="flex items-center justify-between gap-2 mb-4">
      <h2 class="text-lg font-semibold text-gray-900">TIPA Insights</h2>
      <span class="text-sm text-gray-500">{{ tips.length }} tips</span>
    </div>

    <p v-if="tips.length === 0" class="text-sm text-gray-500">
      No tips available yet. Submit reviewed entries to generate learning tips.
    </p>

    <ul v-else class="space-y-3">
      <li
        v-for="tip in tips"
        :key="tip.tipId"
        class="border border-gray-100 rounded-lg p-3 sm:p-4"
      >
        <div
          class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4"
        >
          <div>
            <p class="text-xs uppercase tracking-wide text-gray-500">
              {{ tip.type }}
            </p>
            <p class="text-sm text-gray-900 mt-1">{{ tip.tip }}</p>
            <p class="text-xs text-gray-500 mt-2">
              {{ tip.original }} -> {{ tip.corrected }}
            </p>
            <a
              v-if="tip.reference_link"
              :href="tip.reference_link"
              target="_blank"
              rel="noreferrer"
              class="text-xs text-blue-700 hover:text-blue-900 mt-2 inline-block"
            >
              Open grammar reference
            </a>
          </div>

          <button
            class="min-h-10 self-start px-3 py-2 text-xs rounded-md border transition-colors"
            :class="
              tip.isSaved
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            "
            @click="toggleTip(tip)"
          >
            {{ tip.isSaved ? "Saved" : "Save tip" }}
          </button>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import type { TipInsight } from "../../types";

const props = defineProps<{
  tips: TipInsight[];
}>();

const emit = defineEmits<{
  save: [tip: TipInsight];
  remove: [tipId: string];
}>();

const toggleTip = (tip: TipInsight) => {
  if (tip.isSaved) {
    emit("remove", tip.tipId);
    return;
  }

  emit("save", tip);
};
</script>
