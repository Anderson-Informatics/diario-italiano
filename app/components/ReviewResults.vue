<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <!-- Loading skeleton -->
    <div v-if="isLoading" class="space-y-3 animate-pulse">
      <div class="h-4 bg-gray-200 rounded w-1/3" />
      <div class="h-4 bg-gray-200 rounded w-2/3" />
      <div class="h-4 bg-gray-200 rounded w-1/2" />
    </div>

    <!-- Error state -->
    <div
      v-else-if="errorMessage"
      class="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm"
    >
      {{ errorMessage }}
    </div>

    <template v-else-if="review">
      <!-- Text tabs -->
      <div class="flex border-b border-gray-200 mb-4">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="[
            'px-4 py-2 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700',
          ]"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="space-y-4">
        <div v-if="activeTab === 'original'">
          <p class="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {{ originalText || "No text to display" }}
          </p>
        </div>
        <div v-if="activeTab === 'corrected'">
          <p class="text-gray-800 leading-relaxed whitespace-pre-wrap">
            {{ review.corrected_text }}
          </p>
        </div>
      </div>

      <!-- Stats -->
      <div class="mt-4 p-3 bg-gray-50 rounded-lg">
        <p class="text-sm font-medium text-gray-700 mb-1">Error summary</p>
        <p class="text-sm text-gray-600">
          <span class="text-red-600 font-medium">{{
            review.stats.grammar
          }}</span>
          grammar ·
          <span class="text-orange-500 font-medium">{{
            review.stats.spelling
          }}</span>
          spelling ·
          <span class="text-blue-600 font-medium">{{
            review.stats.vocabulary
          }}</span>
          vocabulary
          <span class="ml-1 text-gray-500"
            >({{ review.stats.total_errors }} total)</span
          >
        </p>
      </div>

      <!-- CEFR Level -->
      <div class="mt-4 p-4 bg-blue-50 rounded-lg">
        <div class="flex items-center gap-3 mb-2">
          <span
            class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm"
          >
            {{ review.cefrLevel.estimated }}
          </span>
          <div>
            <p class="text-sm font-medium text-gray-800">
              Estimated CEFR Level
            </p>
            <p class="text-xs text-gray-500">
              {{ review.cefrLevel.confidence }}% confidence
            </p>
          </div>
        </div>
        <ul
          v-if="review.cefrLevel.recommendations.length > 0"
          class="mt-2 space-y-1"
        >
          <li
            v-for="(rec, i) in review.cefrLevel.recommendations"
            :key="i"
            class="text-sm text-gray-700"
          >
            <span class="font-medium">{{ rec.area }}:</span>
            {{ rec.suggestion }}
            <span v-if="rec.examples.length > 0" class="italic text-gray-500">
              — e.g. "{{ rec.examples[0] }}"</span
            >
          </li>
        </ul>
      </div>

      <div v-if="review.writing" class="mt-4 space-y-4">
        <div class="rounded-lg border border-emerald-100 bg-emerald-50 p-4">
          <div class="flex items-center justify-between gap-3 mb-3">
            <div>
              <p class="text-sm font-medium text-emerald-900">Writing feedback</p>
              <p class="text-xs text-emerald-700">Phase {{ review.writing.phase }}</p>
            </div>
            <span class="inline-flex items-center rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white">
              {{ formatPhaseLabel(review.writing.phase) }}
            </span>
          </div>

          <div v-if="review.writing.strengths.length > 0" class="mb-4">
            <h3 class="text-sm font-medium text-gray-800">Strengths</h3>
            <ul class="mt-2 space-y-1 text-sm text-gray-700">
              <li v-for="(strength, index) in review.writing.strengths" :key="`strength-${index}`">
                {{ strength }}
              </li>
            </ul>
          </div>

          <div v-if="review.writing.priorities.length > 0" class="mb-4">
            <h3 class="text-sm font-medium text-gray-800">Priority improvements</h3>
            <ol class="mt-2 space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li v-for="(priority, index) in review.writing.priorities" :key="`priority-${index}`">
                <span class="font-medium">{{ priority.title }}:</span>
                {{ priority.detail }}
              </li>
            </ol>
          </div>

          <div v-if="review.writing.dimensionScores.length > 0" class="mb-4">
            <h3 class="text-sm font-medium text-gray-800">Dimension scores</h3>
            <div class="mt-2 grid gap-2 sm:grid-cols-2">
              <div
                v-for="score in review.writing.dimensionScores"
                :key="score.dimension"
                class="rounded-md bg-white px-3 py-2 ring-1 ring-emerald-100"
              >
                <div class="flex items-center justify-between gap-3">
                  <span class="text-sm font-medium text-gray-800">{{ formatDimensionLabel(score.dimension) }}</span>
                  <span class="text-sm text-emerald-700">{{ score.score }}/5</span>
                </div>
                <p v-if="score.rationale" class="mt-1 text-xs text-gray-600">
                  {{ score.rationale }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="review.writing.modelRewrite" class="mb-4">
            <h3 class="text-sm font-medium text-gray-800">Model rewrite</h3>
            <p class="mt-2 whitespace-pre-wrap text-sm text-gray-700">{{ review.writing.modelRewrite }}</p>
          </div>

          <div v-if="review.writing.followUpTask" class="rounded-md bg-white px-3 py-3 ring-1 ring-emerald-100">
            <h3 class="text-sm font-medium text-gray-800">Follow-up task</h3>
            <p class="mt-2 text-sm text-gray-700">{{ review.writing.followUpTask.prompt }}</p>
            <p class="mt-1 text-xs text-gray-600">{{ review.writing.followUpTask.instructions }}</p>
          </div>
        </div>
      </div>

      <!-- Corrections list -->
      <div v-if="review.corrections.length > 0" class="mt-6 space-y-3">
        <h3 class="font-medium text-gray-800">
          Corrections ({{ review.corrections.length }})
        </h3>
        <div
          v-for="(correction, index) in review.corrections"
          :key="index"
          class="border-l-4 pl-3 py-1"
          :class="getBorderColor(correction.type)"
        >
          <p class="text-gray-800">
            <span class="line-through text-gray-400">{{
              correction.original
            }}</span>
            →
            <span class="font-medium text-green-700">{{
              correction.corrected
            }}</span>
          </p>
          <span
            class="error-tag inline-block mt-1"
            :class="getTagClass(correction.type)"
          >
            {{ correction.type }}
          </span>
          <p v-if="correction.tip" class="text-sm text-gray-600 mt-1">
            {{ correction.tip }}
          </p>
          <a
            v-if="correction.reference_link"
            :href="correction.reference_link"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-blue-600 hover:underline mt-1 inline-block"
          >
            Learn more ↗
          </a>
        </div>
      </div>

      <div
        v-else
        class="mt-6 text-sm text-green-700 bg-green-50 rounded-lg p-3"
      >
        No errors found — great Italian!
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { Review } from "../types/index";

interface Props {
  originalText?: string;
  review?: Review | null;
  isLoading?: boolean;
  errorMessage?: string | null;
}

defineProps<Props>();

const tabs = [
  { id: "original", label: "Original" },
  { id: "corrected", label: "Corrected" },
];

const activeTab = ref("original");

const getTagClass = (type: string) => {
  const classes: Record<string, string> = {
    grammar: "error-grammar",
    spelling: "error-spelling",
    vocabulary: "error-vocab",
  };
  return classes[type] ?? "";
};

const getBorderColor = (type: string) => {
  const colors: Record<string, string> = {
    grammar: "border-red-500",
    spelling: "border-orange-500",
    vocabulary: "border-blue-500",
  };
  return colors[type] ?? "border-gray-300";
};

const formatPhaseLabel = (phase: string) => {
  const labels: Record<string, string> = {
    'A1-A2': 'Foundations',
    'B1-B2': 'Progressing',
    'C1-C2': 'Refinement',
  };

  return labels[phase] ?? phase;
};

const formatDimensionLabel = (dimension: string) => {
  const labels: Record<string, string> = {
    taskFulfillment: 'Task fulfillment',
    organization: 'Organization',
    grammarControl: 'Grammar control',
    lexicalRange: 'Lexical range',
    cohesion: 'Cohesion',
    register: 'Register',
  };

  return labels[dimension] ?? dimension;
};
</script>
