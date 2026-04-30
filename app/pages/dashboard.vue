<template>
  <div class="space-y-6">
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
      v-if="hasSubmittedEntry && showReview"
      :original-text="lastSubmittedText"
      :review="review"
      :is-loading="reviewLoading"
      :error-message="reviewError"
    />

    <!-- Entry History - shown after submit or when loading entries -->
    <EntryHistory
      v-if="hasSubmittedEntry && (showReview || entries.length > 0)"
      :entries="entries"
      :loading="entriesLoading"
      :current-page="currentPage"
      :total-pages="totalPages"
      @select="loadEntry"
      @page-change="loadEntries"
    />

    <!-- Secondary Content Row - Calendar and Focus Areas -->
    <div v-if="hasSubmittedEntry" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Calendar -->
      <div class="lg:col-span-2">
        <Calendar
          :entry-days="calendarEntryDays"
          :streak="calendarStreak"
          :loading="calendarLoading"
          @select="handleDateSelect"
          @month-change="handleCalendarMonthChange"
        />
        <p
          v-if="calendarNotice"
          class="mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800"
        >
          {{ calendarNotice }}
        </p>
      </div>

      <!-- Focus Areas Sidebar -->
      <div>
        <FocusAreas
          :focus-areas="focusAreas"
          :cefr-level="review?.cefrLevel.estimated ?? cefrLevel"
          :confidence="review?.cefrLevel.confidence ?? confidence"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CalendarEntryMeta,
  CalendarMonthResponse,
  CalendarSelectionPayload,
  Review,
} from "../types/index";

definePageMeta({
  middleware: "auth",
});

// Journal state
const journalContent = ref("");
const isSubmitting = ref(false);
const showReview = ref(false);
const hasSubmittedEntry = ref(false);
const editingEntryId = ref<string | null>(null);
const lastSubmittedText = ref("");

// Review state
const {
  review,
  isLoading: reviewLoading,
  error: reviewError,
  requestReview,
  clearReview,
} = useReview();

// Entry data
interface Entry {
  id: string;
  content: string;
  word_count: number;
  review?: Review;
  created_at: string;
  updated_at: string;
}

interface EntriesResponse {
  entries: Entry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const entries = ref<Entry[]>([]);
const entriesLoading = ref(false);
const currentPage = ref(1);
const totalPages = ref(1);
const PAGE_SIZE = 10;

const calendarEntryDays = ref<Record<string, CalendarEntryMeta>>({});
const calendarStreak = ref(0);
const calendarLoading = ref(false);
const calendarNotice = ref("");
const calendarMonth = ref({
  year: new Date().getUTCFullYear(),
  month: new Date().getUTCMonth() + 1,
});

// Focus areas data
interface FocusArea {
  name: string;
  percentage: number;
  color: "blue" | "purple" | "green";
}

const focusAreas = ref<FocusArea[]>([
  { name: "Passato Prossimo", percentage: 40, color: "blue" },
  { name: "Congiuntivo", percentage: 30, color: "purple" },
  { name: "Vocabulary", percentage: 30, color: "green" },
]);

const cefrLevel = ref("B1");
const confidence = ref(85);

// Load entries from API
const loadEntries = async (page = currentPage.value) => {
  entriesLoading.value = true;
  try {
    const data = await useAuthenticatedFetch<EntriesResponse>("/api/entries", {
      query: {
        page,
        limit: PAGE_SIZE,
      },
    });
    entries.value = data.entries;
    hasSubmittedEntry.value =
      hasSubmittedEntry.value || data.entries.length > 0;
    currentPage.value = data.pagination.page;
    totalPages.value = data.pagination.totalPages;
  } catch (error) {
    console.error("Failed to load entries:", error);
  } finally {
    entriesLoading.value = false;
  }
};

const loadCalendarDates = async (year: number, month: number) => {
  calendarLoading.value = true;

  try {
    const data = await useAuthenticatedFetch<CalendarMonthResponse>(
      "/api/entries/dates",
      {
        query: {
          year,
          month,
        },
      },
    );

    calendarEntryDays.value = data.days.reduce<
      Record<string, CalendarEntryMeta>
    >((acc, day) => {
      acc[day.date] = {
        entryId: day.entryId,
        wordCount: day.wordCount,
        hasReview: day.hasReview,
      };
      return acc;
    }, {});

    calendarStreak.value = data.streak;
  } catch (error) {
    console.error("Failed to load calendar dates:", error);
  } finally {
    calendarLoading.value = false;
  }
};

// Load entry for editing
const loadEntry = (entry: Entry) => {
  journalContent.value = entry.content;
  editingEntryId.value = entry.id;
  lastSubmittedText.value = entry.content;
  clearReview();
  showReview.value = Boolean(entry.review);

  if (entry.review) {
    review.value = entry.review;
  }
};

// Cancel edit mode
const cancelEdit = () => {
  journalContent.value = "";
  editingEntryId.value = null;
  clearReview();
  showReview.value = false;
};

// Submit entry to API
const handleSubmit = async (content: string, entryId?: string) => {
  isSubmitting.value = true;
  showReview.value = false;
  clearReview();
  lastSubmittedText.value = content;
  let savedEntryId: string | undefined;

  try {
    if (entryId) {
      const updatedEntry = await useAuthenticatedFetch<Entry>(
        `/api/entries/${entryId}`,
        {
          method: "PUT",
          body: { content },
        },
      );
      savedEntryId = updatedEntry.id;
    } else {
      const createdEntry = await useAuthenticatedFetch<Entry>("/api/entries", {
        method: "POST",
        body: { content },
      });
      savedEntryId = createdEntry.id;
    }

    await loadEntries(1);
    await loadCalendarDates(
      calendarMonth.value.year,
      calendarMonth.value.month,
    );
    hasSubmittedEntry.value = true;
    journalContent.value = "";
    editingEntryId.value = null;
    showReview.value = true;
  } catch (error) {
    console.error("Failed to save entry:", error);
  } finally {
    isSubmitting.value = false;
  }

  if (!savedEntryId) {
    return;
  }

  const reviewResult = await requestReview(content);

  if (!reviewResult) {
    return;
  }

  try {
    await useAuthenticatedFetch(`/api/entries/${savedEntryId}`, {
      method: "PUT",
      body: { review: reviewResult },
    });
    await loadEntries(currentPage.value);
    await loadCalendarDates(
      calendarMonth.value.year,
      calendarMonth.value.month,
    );
  } catch (error) {
    console.error("Failed to persist review:", error);
  }
};

const handleDateSelect = async (payload: CalendarSelectionPayload) => {
  calendarNotice.value = "";

  if (payload.hasEntry && payload.entryId) {
    const existingEntry = entries.value.find(
      (entry) => entry.id === payload.entryId,
    );

    if (existingEntry) {
      loadEntry(existingEntry);
      return;
    }

    try {
      const entry = await useAuthenticatedFetch<Entry>(
        `/api/entries/${payload.entryId}`,
      );
      loadEntry(entry);
    } catch (error) {
      console.error("Failed to load selected entry:", error);
    }

    return;
  }

  if (payload.isPast) {
    calendarNotice.value = "No entry for this day.";
    return;
  }

  cancelEdit();
  showReview.value = false;
};

const handleCalendarMonthChange = (payload: {
  year: number;
  month: number;
}) => {
  calendarMonth.value = payload;
  loadCalendarDates(payload.year, payload.month);
};

// Load entries on mount
onMounted(() => {
  loadEntries(1);
});
</script>
