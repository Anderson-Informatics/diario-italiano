<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <h2 class="text-lg font-semibold text-gray-800 mb-4">📝 Today's Journal</h2>
    <textarea
      v-model="content"
      @input="handleInput"
      class="font-journal w-full h-80 p-4 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg transition-shadow"
      :placeholder="placeholder"
      :disabled="disabled"
    />
    <div class="flex justify-between items-center mt-4">
      <span class="text-sm text-gray-500">{{ wordCount }} words</span>
      <div class="space-x-2">
        <button 
          @click="clearContent"
          :disabled="!content || disabled"
          class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Clear
        </button>
        <button 
          @click="submitEntry"
          :disabled="!content || disabled"
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
        >
          <span v-if="loading" class="animate-spin">⟳</span>
          <span>{{ loading ? 'Submitting...' : 'Submit for Review' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const content = defineModel<string>({ default: '' })

interface Props {
  disabled?: boolean
  loading?: boolean
}

const props = defineProps<Props>()
const placeholder = 'Scrivi i tuoi pensieri in italiano oggi...'

const wordCount = computed(() => {
  if (!content.value) return 0
  return content.value.trim().split(/\s+/).filter(word => word.length > 0).length
})

const handleInput = () => {
  // Could add debounced auto-save here
}

const clearContent = () => {
  content.value = ''
}

const emit = defineEmits<{
  submit: [content: string]
}>()

const submitEntry = () => {
  if (content.value.trim()) {
    emit('submit', content.value)
  }
}
</script>