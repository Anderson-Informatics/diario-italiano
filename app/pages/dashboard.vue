<template>
  <div class="space-y-6">
    <!-- Page Tabs -->
    <div class="flex space-x-4 border-b border-gray-200">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="[
          'px-4 py-2 text-sm font-medium transition-colors',
          activeTab === tab.id 
            ? 'text-blue-600 border-b-2 border-blue-600' 
            : 'text-gray-500 hover:text-gray-700'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Journal Editor -->
    <JournalEditor 
      v-model="journalContent"
      :disabled="isSubmitting"
      :loading="isSubmitting"
      :entry-id="editingEntryId"
      @submit="handleSubmit"
      @cancel="cancelEdit"
    />

    <!-- Review Results - shown after submit, exits distraction-free mode -->
    <ReviewResults 
      v-if="showReview"
      :original-text="journalContent"
      :corrected-text="correctedText"
      :corrections="corrections"
      :stats="stats"
    />

    <!-- Entry History - shown after submit or when loading entries -->
    <EntryHistory 
      v-if="showReview || entries.length > 0"
      :entries="entries"
      :loading="entriesLoading"
      @select="loadEntry"
    />

    <!-- Secondary Content Row - Calendar and Focus Areas - hidden in distraction-free mode -->
    <div v-show="showReview" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Calendar -->
      <div class="lg:col-span-2">
        <Calendar @select="handleDateSelect" />
      </div>

      <!-- Focus Areas Sidebar -->
      <div>
        <FocusAreas 
          :focus-areas="focusAreas"
          :cefr-level="cefrLevel"
          :confidence="confidence"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const tabs = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'stats', label: 'Stats' },
  { id: 'entries', label: 'Entries' }
]

const activeTab = ref('dashboard')

// Journal state
const journalContent = ref('')
const isSubmitting = ref(false)
const showReview = ref(false)
const editingEntryId = ref<string | null>(null)

// Entry data
interface Entry {
  id: string
  content: string
  word_count: number
  created_at: string
  updated_at: string
}

const entries = ref<Entry[]>([])
const entriesLoading = ref(false)

// Review state
const correctedText = ref('')
const corrections = ref<Array<{
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  tip?: string
}>>([])
const stats = ref<{
  grammar: number
  spelling: number
  vocabulary: number
  total: number
} | undefined>(undefined)

// Focus areas data
interface FocusArea {
  name: string
  percentage: number
  color: 'blue' | 'purple' | 'green'
}

const focusAreas = ref<FocusArea[]>([
  { name: 'Passato Prossimo', percentage: 40, color: 'blue' },
  { name: 'Congiuntivo', percentage: 30, color: 'purple' },
  { name: 'Vocabulary', percentage: 30, color: 'green' }
])

const cefrLevel = ref('B1')
const confidence = ref(85)

// Load entries from API
const loadEntries = async () => {
  entriesLoading.value = true
  try {
    const data = await $fetch<Entry[]>('/api/entries')
    entries.value = data
  } catch (error) {
    console.error('Failed to load entries:', error)
  } finally {
    entriesLoading.value = false
  }
}

// Load entry for editing
const loadEntry = (entry: Entry) => {
  journalContent.value = entry.content
  editingEntryId.value = entry.id
}

// Cancel edit mode
const cancelEdit = () => {
  journalContent.value = ''
  editingEntryId.value = null
}

// Submit entry to API
const handleSubmit = async (content: string, entryId?: string) => {
  isSubmitting.value = true
  showReview.value = false
  
  try {
    if (entryId) {
      // Update existing entry
      await $fetch(`/api/entries/${entryId}`, {
        method: 'PUT',
        body: { content }
      })
    } else {
      // Create new entry
      await $fetch('/api/entries', {
        method: 'POST',
        body: { content }
      })
    }
    
    // Reload entries and show review
    await loadEntries()
    journalContent.value = ''
    editingEntryId.value = null
    
    // Mock response for review
    correctedText.value = content.replace('congiuntivo', 'il congiuntivo')
    corrections.value = [
      {
        original: 'congiuntivo',
        corrected: 'il congiuntivo',
        type: 'grammar',
        tip: 'Use the definite article "il" before congiuntivo'
      }
    ]
    stats.value = {
      grammar: 1,
      spelling: 0,
      vocabulary: 0,
      total: 1
    }
    
    showReview.value = true
  } catch (error) {
    console.error('Failed to save entry:', error)
  } finally {
    isSubmitting.value = false
  }
}

const handleDateSelect = (date: Date) => {
  // Placeholder - will load entry for selected date
  console.log('Selected date:', date)
}

// Load entries on mount
onMounted(() => {
  loadEntries()
})
</script>