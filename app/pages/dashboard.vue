<template>
  <div class="space-y-4 sm:space-y-6">
    <JournalEditor
      v-model="journalContent"
      :disabled="isSubmitting"
      :loading="isSubmitting"
      :save-loading="isSavingDraft"
      :save-status="draftSaveStatus"
      :save-error="draftSaveError"
      :entry-id="editingEntryId"
      :locked="isEntryLocked"
      @save="handleSave"
      @submit="handleSubmit"
      @cancel="cancelEdit"
    />
    <div v-if="isDistractionFreeActive" class="flex justify-center">
      <button
        class="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
        @click="disableDistractionFreeMode"
      >
        Turn off distraction free mode
      </button>
    </div>

    <template v-else>
      <p
        v-if="activeReviewPreferenceHint"
        class="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-sm text-sky-800"
      >
        {{ activeReviewPreferenceHint }}
      </p>

      <ReviewResults
        v-if="hasSubmittedEntry && showReview"
        :original-text="lastSubmittedText"
        :review="review"
        :is-loading="reviewLoading"
        :error-message="reviewError"
      />

      <EntryHistory
        v-if="hasSubmittedEntry && (showReview || entries.length > 0)"
        :entries="entries"
        :loading="entriesLoading"
        :current-page="currentPage"
        :total-pages="totalPages"
        :timezone="userTimezone"
        @select="loadEntry"
        @page-change="loadEntries"
      />

      <div
        v-if="hasSubmittedEntry"
        class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6"
      >
        <div class="lg:col-span-2">
          <Calendar
            :entry-days="calendarEntryDays"
            :streak="calendarStreak"
            :loading="calendarLoading"
            :timezone="userTimezone"
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

        <div>
          <FocusAreas
            :focus-areas="focusAreas"
            :cefr-level="cefrLevel"
            :confidence="confidence"
            :focus-period-label="focusPeriodLabel"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type {
  CalendarEntryMeta,
  CalendarMonthResponse,
  CalendarSelectionPayload,
  Review,
  WritingReviewPhase,
} from "../types/index";
import {
  getCurrentYearMonthInTimeZone,
  getDayKeyInTimeZone,
  getTodayKeyInTimeZone,
} from "../utils/timezone";

definePageMeta({
  middleware: "auth",
});

const authStore = useAuthStore();
const userTimezone = computed(() => authStore.user?.timezone || "UTC");

const journalContent = ref("");
const isSubmitting = ref(false);
const isSavingDraft = ref(false);
const showReview = ref(false);
const hasSubmittedEntry = ref(false);
const editingEntryId = ref<string | null>(null);
const isEntryLocked = ref(false);
const lastSubmittedText = ref("");
const lastPersistedContent = ref("");
const lastDraftSavedAt = ref<string | null>(null);
const draftSaveError = ref<string | null>(null);
const distractionFreeDismissed = ref(false);
const hasCompletedTodayEntryFromPageOne = ref(false);
const shouldResumeLatestDraft = ref(true);

type DraftSaveSource = "auto" | "manual";

interface DraftSaveRequest {
  content: string;
  source: DraftSaveSource;
}

const {
  review,
  isLoading: reviewLoading,
  error: reviewError,
  requestReview,
  clearReview,
} = useReview();

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
const AUTOSAVE_DELAY_MS = 5000;

const initialMonth = getCurrentYearMonthInTimeZone(userTimezone.value);
const calendarEntryDays = ref<Record<string, CalendarEntryMeta>>({});
const calendarStreak = ref(0);
const calendarLoading = ref(false);
const calendarNotice = ref("");
const calendarMonth = ref({
  year: initialMonth.year,
  month: initialMonth.month,
});

interface FocusArea {
  name: string;
  percentage: number;
  color: "blue" | "purple" | "green";
}

const { data: dashboardStats } = useStats();

const focusAreaColors: ReadonlyArray<FocusArea["color"]> = [
  "blue",
  "purple",
  "green",
];

const focusAreas = computed<FocusArea[]>(() => {
  if (!dashboardStats.value?.hasEnoughData) {
    return [];
  }

  const recommendations = dashboardStats.value?.focusRecommendations ?? [];
  const topRecommendations = recommendations.slice(0, 3);

  if (topRecommendations.length === 0) {
    return [];
  }

  const totalErrors = topRecommendations.reduce(
    (sum, item) => sum + item.errorCount,
    0,
  );

  if (totalErrors <= 0) {
    return [];
  }

  return topRecommendations.map((item, index) => ({
    name: item.area,
    percentage: Math.round((item.errorCount / totalErrors) * 100),
    color: focusAreaColors[index] ?? "green",
  }));
});

const cefrLevel = computed(() => {
  return (
    review.value?.cefrLevel.estimated ??
    dashboardStats.value?.monthlySummary.cefrCurrent ??
    "A1"
  );
});

const confidence = computed(() => {
  if (review.value?.cefrLevel.confidence !== undefined) {
    return review.value.cefrLevel.confidence;
  }

  return dashboardStats.value?.cefrProgression.at(-1)?.confidence ?? 0;
});

const focusPeriodLabel = computed(() => {
  const range = dashboardStats.value?.range ?? "month";

  if (range === "week") {
    return "Based on the last 7 days";
  }

  if (range === "all") {
    return "Based on all reviewed entries";
  }

  return "Based on the last 30 days";
});

const cefrToWritingPhase = (level?: string): WritingReviewPhase | undefined => {
  if (level === "A1" || level === "A2") {
    return "A1-A2";
  }

  if (level === "B1" || level === "B2") {
    return "B1-B2";
  }

  if (level === "C1" || level === "C2") {
    return "C1-C2";
  }

  return undefined;
};

const getLearnerPhaseForReview = (): WritingReviewPhase | undefined => {
  if (
    authStore.user?.useTargetReviewPhase &&
    authStore.user.targetReviewPhase
  ) {
    return authStore.user.targetReviewPhase;
  }

  if (review.value?.writing?.phase) {
    return review.value.writing.phase;
  }

  const reviewedEntry = entries.value.find(
    (entry) => entry.review?.cefrLevel.estimated,
  );
  return cefrToWritingPhase(reviewedEntry?.review?.cefrLevel.estimated);
};

const activeReviewPreferenceHint = computed(() => {
  if (
    !authStore.user?.useTargetReviewPhase ||
    !authStore.user.targetReviewPhase
  ) {
    return "";
  }

  return `AI reviews are using your fixed learner phase: ${authStore.user.targetReviewPhase}. You can change this in Profile & Settings.`;
});

const draftSaveStatus = computed(() => {
  if (draftSaveError.value) {
    return "";
  }

  if (isSavingDraft.value) {
    return "Saving draft...";
  }

  if (
    journalContent.value.trim() &&
    journalContent.value !== lastPersistedContent.value
  ) {
    return "Unsaved changes";
  }

  if (lastDraftSavedAt.value && editingEntryId.value) {
    return `Draft saved at ${formatDraftSaveTime(lastDraftSavedAt.value)}`;
  }

  return "";
});

const hasCompletedTodayEntry = computed(() => {
  return hasCompletedTodayEntryFromPageOne.value;
});

const isDistractionFreeActive = computed(() => {
  return !hasCompletedTodayEntry.value && !distractionFreeDismissed.value;
});

const disableDistractionFreeMode = () => {
  distractionFreeDismissed.value = true;
};

let autosaveTimer: ReturnType<typeof setTimeout> | null = null;
let queuedDraftSave: DraftSaveRequest | null = null;
let activeDraftSavePromise: Promise<Entry | null> | null = null;

const clearAutosaveTimer = () => {
  if (autosaveTimer) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
  }
};

const formatDraftSaveTime = (value: string) => {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const refreshEntriesAndCalendar = async () => {
  await Promise.all([
    loadEntries(currentPage.value),
    loadCalendarDates(calendarMonth.value.year, calendarMonth.value.month),
  ]);
};

const saveDraftToServer = async (content: string): Promise<Entry | null> => {
  const trimmedContent = content.trim();

  if (!trimmedContent || isEntryLocked.value) {
    return null;
  }

  isSavingDraft.value = true;
  draftSaveError.value = null;

  try {
    const savedEntry = editingEntryId.value
      ? await useAuthenticatedFetch<Entry>(
          `/api/entries/${editingEntryId.value}`,
          {
            method: "PUT",
            body: { content },
          },
        )
      : await useAuthenticatedFetch<Entry>("/api/entries", {
          method: "POST",
          body: { content },
        });

    editingEntryId.value = savedEntry.id;
    lastPersistedContent.value = savedEntry.content;
    lastDraftSavedAt.value = savedEntry.updated_at;
    hasSubmittedEntry.value = true;

    await refreshEntriesAndCalendar();

    return savedEntry;
  } catch (error) {
    draftSaveError.value = "Draft could not be saved. Try again.";
    console.error("Failed to save draft:", error);
    return null;
  } finally {
    isSavingDraft.value = false;
  }
};

const drainDraftSaveQueue = async (
  initialRequest: DraftSaveRequest,
): Promise<Entry | null> => {
  let request: DraftSaveRequest | null = initialRequest;
  let lastResult: Entry | null = null;

  while (request) {
    lastResult = await saveDraftToServer(request.content);
    request = queuedDraftSave;
    queuedDraftSave = null;

    if (request && request.content === lastPersistedContent.value) {
      request = null;
    }
  }

  return lastResult;
};

const queueDraftSave = async (
  content: string,
  source: DraftSaveSource,
): Promise<Entry | null> => {
  const trimmedContent = content.trim();

  if (!trimmedContent || isEntryLocked.value) {
    return null;
  }

  if (content === lastPersistedContent.value) {
    draftSaveError.value = null;
    return null;
  }

  const request = { content, source } satisfies DraftSaveRequest;

  if (activeDraftSavePromise) {
    queuedDraftSave = request;
    return activeDraftSavePromise;
  }

  activeDraftSavePromise = drainDraftSaveQueue(request).finally(() => {
    activeDraftSavePromise = null;
  });

  return activeDraftSavePromise;
};

const loadEntries = async (page = currentPage.value) => {
  entriesLoading.value = true;
  const requestedPage = page;
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

    if (requestedPage === 1) {
      const todayKey = getTodayKeyInTimeZone(userTimezone.value);
      hasCompletedTodayEntryFromPageOne.value = data.entries.some(
        (entry) =>
          getDayKeyInTimeZone(
            new Date(entry.created_at),
            userTimezone.value,
          ) === todayKey,
      );

      if (
        shouldResumeLatestDraft.value &&
        !editingEntryId.value &&
        !journalContent.value.trim()
      ) {
        const latestDraft = data.entries.find((entry) => !entry.review);

        if (latestDraft) {
          loadEntry(latestDraft);
        }

        shouldResumeLatestDraft.value = false;
      }
    }
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

const loadEntry = (entry: Entry) => {
  clearAutosaveTimer();
  draftSaveError.value = null;
  lastPersistedContent.value = entry.content;
  lastDraftSavedAt.value = entry.updated_at;
  journalContent.value = entry.content;
  lastSubmittedText.value = entry.content;
  clearReview();

  if (entry.review) {
    // Entry has been reviewed — lock it, show it read-only with existing review
    editingEntryId.value = entry.id;
    isEntryLocked.value = true;
    review.value = entry.review;
    showReview.value = true;
  } else {
    // No review yet (e.g. AI error) — allow editing and re-submitting
    editingEntryId.value = entry.id;
    isEntryLocked.value = false;
    showReview.value = false;
  }
};

const cancelEdit = () => {
  clearAutosaveTimer();
  queuedDraftSave = null;
  draftSaveError.value = null;
  lastPersistedContent.value = "";
  lastDraftSavedAt.value = null;
  journalContent.value = "";
  editingEntryId.value = null;
  isEntryLocked.value = false;
  clearReview();
  showReview.value = false;
};

const handleSave = async (content: string) => {
  clearAutosaveTimer();
  queuedDraftSave = null;
  await activeDraftSavePromise;
  await queueDraftSave(content, "manual");
};

const handleSubmit = async (content: string, entryId?: string) => {
  clearAutosaveTimer();
  queuedDraftSave = null;
  await activeDraftSavePromise;

  isSubmitting.value = true;
  showReview.value = false;
  clearReview();
  lastSubmittedText.value = content;
  let savedEntryId: string | undefined = entryId ?? undefined;

  try {
    const savedEntry = await queueDraftSave(content, "manual");

    if (!savedEntryId) {
      savedEntryId = savedEntry?.id;
    }

    if (!savedEntryId) {
      return;
    }

    const reviewResult = await requestReview(content, {
      learnerPhase: getLearnerPhaseForReview(),
    });

    if (!reviewResult) {
      showReview.value = true;
      return;
    }

    await useAuthenticatedFetch(`/api/entries/${savedEntryId}`, {
      method: "PUT",
      body: { review: reviewResult },
    });
    await refreshEntriesAndCalendar();
    clearAutosaveTimer();
    draftSaveError.value = null;
    lastPersistedContent.value = "";
    lastDraftSavedAt.value = null;
    journalContent.value = "";
    editingEntryId.value = null;
    isEntryLocked.value = false;
    hasSubmittedEntry.value = true;
    showReview.value = true;
  } catch (error) {
    console.error("Failed to submit entry for review:", error);
  } finally {
    isSubmitting.value = false;
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

watch(userTimezone, (timezone) => {
  const month = getCurrentYearMonthInTimeZone(timezone);
  calendarMonth.value = month;
  loadCalendarDates(month.year, month.month);
  distractionFreeDismissed.value = false;
});

watch(journalContent, (value) => {
  clearAutosaveTimer();

  if (isEntryLocked.value || isSubmitting.value) {
    return;
  }

  if (!value.trim() || value === lastPersistedContent.value) {
    if (!value.trim()) {
      draftSaveError.value = null;
    }
    return;
  }

  autosaveTimer = setTimeout(() => {
    void queueDraftSave(value, "auto");
  }, AUTOSAVE_DELAY_MS);
});

onMounted(() => {
  void loadEntries(1);
});

onBeforeUnmount(() => {
  clearAutosaveTimer();
});
</script>
