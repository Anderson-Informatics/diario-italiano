<template>
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">
      {{ entryId ? "Edit Entry" : "📝 Today's Journal" }}
    </h2>
    <textarea
      v-model="content"
      @input="handleInput"
      class="font-journal w-full h-64 sm:h-80 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base sm:text-lg transition-shadow"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <div
      class="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center"
    >
      <span class="text-xs sm:text-sm text-gray-500"
        >{{ wordCount }} words • {{ characterCount }} characters</span
      >
      <div
        class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-2"
      >
        <button
          v-if="entryId"
          @click="cancelEdit"
          :disabled="disabled"
          class="min-h-11 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Cancel
        </button>
        <button
          @click="clearContent"
          :disabled="!content || disabled"
          class="min-h-11 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
        <button
          @click="submitEntry"
          :disabled="!content || disabled"
          class="min-h-11 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
        >
          <span v-if="loading" class="animate-spin">⟳</span>
          <span>{{
            loading
              ? "Saving..."
              : entryId
                ? "Update Entry"
                : "Submit for Review"
          }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  disabled?: boolean;
  loading?: boolean;
  entryId?: string | null;
}

const props = defineProps<Props>();
const placeholder = "Scrivi i tuoi pensieri in italiano oggi...";

const content = defineModel<string>({ default: "" });

const wordCount = computed(() => {
  return countWords(content.value ?? "");
});

const characterCount = computed(() => {
  return countCharacters(content.value ?? "");
});

const handleInput = () => {
  // Could add debounced auto-save here
};

const clearContent = () => {
  content.value = "";
};

const emit = defineEmits<{
  submit: [content: string, entryId?: string];
  cancel: [];
}>();

const submitEntry = () => {
  if (content.value.trim()) {
    emit("submit", content.value, props.entryId ?? undefined);
  }
};

const cancelEdit = () => {
  emit("cancel");
};
</script>
