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
      @submit="handleSubmit"
    />

    <!-- Review Results -->
    <ReviewResults 
      v-if="showReview"
      :original-text="journalContent"
      :corrected-text="correctedText"
      :corrections="corrections"
      :stats="stats"
    />

    <!-- Secondary Content Row - Calendar and Focus Areas -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

// Handlers
const handleSubmit = async (content: string) => {
  isSubmitting.value = true
  showReview.value = false
  
  // Placeholder - will be replaced with actual API call
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  // Mock response
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
  
  isSubmitting.value = false
  showReview.value = true
}

const handleDateSelect = (date: Date) => {
  // Placeholder - will load entry for selected date
  console.log('Selected date:', date)
}
</script>