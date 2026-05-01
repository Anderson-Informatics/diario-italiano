<template>
  <section
    class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
  >
    <article
      class="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm"
    >
      <p class="text-xs uppercase tracking-wide text-gray-500">Entries</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {{ summary.entriesWritten }}
      </p>
    </article>

    <article
      class="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm"
    >
      <p class="text-xs uppercase tracking-wide text-gray-500">Avg Errors</p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {{ summary.averageErrorsPerEntry }}
      </p>
    </article>

    <article
      class="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm"
    >
      <p class="text-xs uppercase tracking-wide text-gray-500">Improvement</p>
      <p
        class="mt-2 text-2xl font-semibold"
        :class="
          summary.improvementRate >= 0 ? 'text-green-700' : 'text-red-700'
        "
      >
        {{ summary.improvementRate }}%
      </p>
    </article>

    <article
      class="bg-white rounded-xl border border-gray-100 p-4 sm:p-5 shadow-sm"
    >
      <p class="text-xs uppercase tracking-wide text-gray-500">
        Current Streak
      </p>
      <p class="mt-2 text-2xl font-semibold text-gray-900">
        {{ summary.currentStreak }} days
      </p>
    </article>
  </section>
</template>

<script setup lang="ts">
interface Summary {
  entriesWritten: number;
  averageErrorsPerEntry: number;
  improvementRate: number;
  currentStreak: number;
}

defineProps<{
  summary: Summary;
}>();
</script>
