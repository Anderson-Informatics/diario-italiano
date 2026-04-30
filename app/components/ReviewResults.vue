<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="flex border-b border-gray-200 mb-4">
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
    
    <div class="space-y-4">
      <div v-if="activeTab === 'original'">
        <p class="text-gray-800 leading-relaxed">
          {{ originalText || 'No text to display' }}
        </p>
      </div>
      
      <div v-if="activeTab === 'corrected'" class="space-y-3">
        <p class="text-gray-800 leading-relaxed">
          {{ correctedText || 'Submit text for review to see corrections' }}
        </p>
      </div>
    </div>
    
    <!-- Corrections List -->
    <div v-if="corrections && corrections.length > 0" class="mt-6 space-y-3">
      <h3 class="font-medium text-gray-800">Corrections:</h3>
      <div 
        v-for="(correction, index) in corrections" 
        :key="index"
        class="border-l-4 pl-3 py-1"
        :class="getBorderColor(correction.type)"
      >
        <p class="text-gray-800">
          <span class="line-through text-gray-500">{{ correction.original }}</span>
          →
          <span class="font-medium text-green-800">{{ correction.corrected }}</span>
        </p>
        <span 
          class="error-tag inline-block mt-1"
          :class="getTagClass(correction.type)"
        >
          {{ correction.type }}
        </span>
        <p v-if="correction.tip" class="text-sm text-gray-600 mt-1">
          Tip: {{ correction.tip }}
        </p>
      </div>
    </div>
    
    <!-- Stats -->
    <div v-if="stats" class="mt-4 p-3 bg-gray-50 rounded-lg">
      <p class="text-sm"><strong>Stats:</strong> 
        {{ stats.grammar }} grammar, 
        {{ stats.spelling }} spelling, 
        {{ stats.vocabulary }} vocabulary errors
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Correction {
  original: string
  corrected: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  tip?: string
}

interface Stats {
  grammar: number
  spelling: number
  vocabulary: number
  total: number
}

interface Props {
  originalText?: string
  correctedText?: string
  corrections?: Correction[]
  stats?: Stats
}

defineProps<Props>()

const tabs = [
  { id: 'original', label: 'Original' },
  { id: 'corrected', label: 'Corrected' }
]

const activeTab = ref('original')

const getTagClass = (type: string) => {
  const classes = {
    grammar: 'error-grammar',
    spelling: 'error-spelling',
    vocabulary: 'error-vocab'
  }
  return classes[type as keyof typeof classes] || ''
}

const getBorderColor = (type: string) => {
  const colors = {
    grammar: 'border-red-500',
    spelling: 'border-orange-500',
    vocabulary: 'border-blue-500'
  }
  return colors[type as keyof typeof colors] || 'border-gray-500'
}
</script>