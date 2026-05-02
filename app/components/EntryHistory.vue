<template>
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">Entry History</h2>

    <div v-if="loading" class="text-center py-4">
      <div class="animate-spin inline-block">⟳</div>
      <p class="text-gray-500 mt-2">Loading entries...</p>
    </div>

    <div
      v-else-if="entries.length === 0"
      class="text-center py-4 text-gray-500"
    >
      No entries yet. Start writing your first journal entry!
    </div>

    <ul v-else class="space-y-2 max-h-80 sm:max-h-96 overflow-y-auto">
      <li
        v-for="entry in entries"
        :key="entry.id"
        @click="$emit('select', entry)"
        class="p-3 sm:p-3.5 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
      >
        <div
          class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2"
        >
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-gray-800 truncate">
              {{ formatDate(entry.created_at) }}
            </p>
            <p class="text-xs text-gray-500 mt-1 line-clamp-2">
              {{ truncateContent(entry.content) }}
            </p>
          </div>
          <span class="text-xs text-gray-400 sm:ml-2"
            >{{ entry.word_count }} words</span
          >
        </div>
      </li>
    </ul>

    <div
      v-if="entries.length > 0 && totalPages > 1"
      class="mt-4 flex items-center justify-between gap-2"
    >
      <button
        :disabled="currentPage <= 1 || loading"
        class="min-h-11 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('pageChange', currentPage - 1)"
      >
        Previous
      </button>
      <span class="text-xs text-gray-500"
        >Page {{ currentPage }} of {{ totalPages }}</span
      >
      <button
        :disabled="currentPage >= totalPages || loading"
        class="min-h-11 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        @click="$emit('pageChange', currentPage + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Entry {
  id: string;
  content: string;
  word_count: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  entries: Entry[];
  loading?: boolean;
  currentPage?: number;
  totalPages?: number;
  timezone?: string;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  currentPage: 1,
  totalPages: 1,
  timezone: "UTC",
});
defineEmits<{
  select: [entry: Entry];
  pageChange: [page: number];
}>();

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: props.timezone,
  });
}

function truncateContent(content: string, maxLength = 60): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength) + "...";
}
</script>
