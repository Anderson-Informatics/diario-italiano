<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <!-- Creative loading state -->
    <div
      v-if="isLoading"
      class="proof-loader"
      role="status"
      aria-live="polite"
      aria-label="Review in progress"
    >
      <div class="proof-loader__sheet">
        <div class="proof-loader__scan" />

        <div class="proof-loader__line proof-loader__line--1" />
        <div class="proof-loader__line proof-loader__line--2" />

        <div class="proof-loader__line proof-loader__line--3 proof-loader__line--error">
          <span class="proof-loader__error-strike" />
        </div>

        <div class="proof-loader__line proof-loader__line--4 proof-loader__line--fixed" />
        <div class="proof-loader__line proof-loader__line--5" />

        <div class="proof-loader__cursor" />
        <div class="proof-loader__lens" />
      </div>

      <p class="proof-loader__title">Reviewing your text</p>
      <p class="proof-loader__subtitle">
        <span class="proof-loader__message proof-loader__message--a">Detecting issues</span>
        <span class="proof-loader__message proof-loader__message--b">Applying corrections</span>
        <span class="proof-loader__message proof-loader__message--c">Preparing feedback</span>
      </p>
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

<style scoped>
.proof-loader {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: linear-gradient(180deg, #f9fafb 0%, #eef2ff 100%);
  padding: 18px;
}

.proof-loader__sheet {
  position: relative;
  width: min(520px, 100%);
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px 14px;
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.proof-loader__scan {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    110deg,
    transparent 0%,
    rgba(37, 99, 235, 0.08) 45%,
    rgba(16, 185, 129, 0.1) 55%,
    transparent 100%
  );
  transform: translateX(-110%);
  animation: review-scan 2.2s ease-in-out infinite;
}

.proof-loader__line {
  height: 10px;
  border-radius: 999px;
  background: #d1d5db;
  margin: 10px 0;
  position: relative;
  overflow: hidden;
}

.proof-loader__line--1 {
  width: 92%;
}

.proof-loader__line--2 {
  width: 86%;
}

.proof-loader__line--3 {
  width: 78%;
}

.proof-loader__line--4 {
  width: 82%;
}

.proof-loader__line--5 {
  width: 64%;
}

.proof-loader__line--error {
  background: #fca5a5;
  animation: review-error-pulse 1.6s ease-in-out infinite;
}

.proof-loader__error-strike {
  position: absolute;
  left: -8%;
  top: 48%;
  width: 116%;
  height: 2px;
  background: #b91c1c;
  transform: rotate(-2deg);
}

.proof-loader__line--fixed {
  background: #86efac;
  animation: review-fixed-reveal 2.2s ease-in-out infinite;
  transform-origin: left center;
}

.proof-loader__cursor {
  position: absolute;
  right: 18px;
  bottom: 14px;
  width: 2px;
  height: 14px;
  background: #2563eb;
  animation: review-blink 1s steps(1) infinite;
}

.proof-loader__lens {
  position: absolute;
  top: 8px;
  left: -42px;
  width: 28px;
  height: 28px;
  border: 3px solid #1d4ed8;
  border-radius: 999px;
  background: rgba(219, 234, 254, 0.55);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
  animation: review-lens-pass 2.2s ease-in-out infinite;
}

.proof-loader__lens::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 3px;
  background: #1d4ed8;
  border-radius: 999px;
  right: -8px;
  bottom: -1px;
  transform: rotate(35deg);
}

.proof-loader__title {
  margin: 12px 0 2px;
  text-align: center;
  font-weight: 600;
  color: #111827;
}

.proof-loader__subtitle {
  position: relative;
  min-height: 20px;
  margin: 0;
  text-align: center;
  color: #4b5563;
  font-size: 0.9rem;
}

.proof-loader__message {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  opacity: 0;
  white-space: nowrap;
}

.proof-loader__message--a {
  animation: review-message-cycle 4.8s infinite;
}

.proof-loader__message--b {
  animation: review-message-cycle 4.8s infinite;
  animation-delay: 1.6s;
}

.proof-loader__message--c {
  animation: review-message-cycle 4.8s infinite;
  animation-delay: 3.2s;
}

@keyframes review-scan {
  0% {
    transform: translateX(-110%);
  }
  100% {
    transform: translateX(110%);
  }
}

@keyframes review-lens-pass {
  0% {
    transform: translateX(0) translateY(0);
  }
  30% {
    transform: translateX(170px) translateY(6px);
  }
  65% {
    transform: translateX(330px) translateY(12px);
  }
  100% {
    transform: translateX(520px) translateY(18px);
  }
}

@keyframes review-fixed-reveal {
  0%,
  35% {
    transform: scaleX(0.25);
    opacity: 0.5;
  }
  55%,
  100% {
    transform: scaleX(1);
    opacity: 1;
  }
}

@keyframes review-error-pulse {
  0%,
  100% {
    filter: saturate(0.9);
  }
  50% {
    filter: saturate(1.2);
  }
}

@keyframes review-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

@keyframes review-message-cycle {
  0%,
  10% {
    opacity: 0;
    transform: translateX(-50%) translateY(4px);
  }
  18%,
  44% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  52%,
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-4px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .proof-loader__scan,
  .proof-loader__line--error,
  .proof-loader__line--fixed,
  .proof-loader__cursor,
  .proof-loader__lens,
  .proof-loader__message {
    animation: none !important;
  }
}
</style>
