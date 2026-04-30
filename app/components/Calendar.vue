<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-gray-800">📅 {{ monthYear }}</h2>
      <div class="flex items-center space-x-2">
        <button
          @click="goToCurrentMonth"
          class="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          @click="previousMonth"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <button
          @click="nextMonth"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          &rarr;
        </button>
      </div>
    </div>

    <p v-if="loading" class="text-sm text-gray-500 mb-3">Loading calendar...</p>

    <!-- Weekday headers -->
    <div class="grid grid-cols-7 gap-1 mb-2">
      <div
        v-for="day in weekdays"
        :key="day"
        class="text-center text-sm font-medium text-gray-500"
      >
        {{ day }}
      </div>
    </div>

    <!-- Calendar days -->
    <div class="grid grid-cols-7 gap-1">
      <button
        v-for="day in calendarDays"
        :key="day.date"
        @click="selectDay(day)"
        :class="[
          'calendar-day',
          day.isCurrentMonth ? 'text-gray-800' : 'text-gray-300',
          day.isToday ? 'today' : '',
          day.hasEntry ? 'has-entry' : '',
        ]"
        :title="day.tooltip"
        :disabled="!day.isCurrentMonth"
      >
        {{ day.dayNumber }}
      </button>
    </div>

    <!-- Streak indicator -->
    <div class="mt-4 flex items-center justify-center space-x-2">
      <span class="text-2xl">🔥</span>
      <span class="font-medium text-gray-700">{{ streak }} day streak</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CalendarEntryMeta,
  CalendarMonthChangePayload,
  CalendarSelectionPayload,
} from "../types";

interface CalendarDay {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEntry: boolean;
  entryId?: string;
  isPast: boolean;
  isFuture: boolean;
  tooltip: string;
}

interface Props {
  entryDays?: Record<string, CalendarEntryMeta>;
  streak?: number;
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  entryDays: () => ({}),
  streak: 0,
  loading: false,
});

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const currentMonth = ref(
  new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)),
);

const toDayKey = (date: Date) => date.toISOString().slice(0, 10);

const getTodayKey = () => {
  const now = new Date();
  return toDayKey(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ),
  );
};

const emit = defineEmits<{
  select: [payload: CalendarSelectionPayload];
  monthChange: [payload: CalendarMonthChangePayload];
}>();

const monthYear = computed(() => {
  return currentMonth.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
});

const calendarDays = computed(() => {
  const year = currentMonth.value.getUTCFullYear();
  const month = currentMonth.value.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1));
  const firstDayOfWeek = firstDay.getUTCDay();

  // Get last day of previous month
  const prevMonth = new Date(Date.UTC(year, month, 0));
  const prevMonthDays = prevMonth.getUTCDate();

  // Get last day of current month
  const lastDay = new Date(Date.UTC(year, month + 1, 0));
  const lastDate = lastDay.getUTCDate();

  const days: CalendarDay[] = [];
  const todayKey = getTodayKey();

  // Add previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(year, month - 1, prevMonthDays - i));
    const dayKey = toDayKey(date);
    const entry = props.entryDays[dayKey];

    days.push({
      date: dayKey,
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: false,
      hasEntry: Boolean(entry),
      entryId: entry?.entryId,
      isPast: dayKey < todayKey,
      isFuture: dayKey > todayKey,
      tooltip: entry ? `${entry.wordCount} words` : "",
    });
  }

  // Add current month days
  for (let i = 1; i <= lastDate; i++) {
    const date = new Date(Date.UTC(year, month, i));
    const dayKey = toDayKey(date);
    const entry = props.entryDays[dayKey];

    days.push({
      date: dayKey,
      dayNumber: i,
      isCurrentMonth: true,
      isToday: dayKey === todayKey,
      hasEntry: Boolean(entry),
      entryId: entry?.entryId,
      isPast: dayKey < todayKey,
      isFuture: dayKey > todayKey,
      tooltip: entry ? `${entry.wordCount} words` : "",
    });
  }

  // Add next month days to fill the grid
  const remainingDays = 42 - days.length;
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(Date.UTC(year, month + 1, i));
    const dayKey = toDayKey(date);
    const entry = props.entryDays[dayKey];

    days.push({
      date: dayKey,
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
      hasEntry: Boolean(entry),
      entryId: entry?.entryId,
      isPast: dayKey < todayKey,
      isFuture: dayKey > todayKey,
      tooltip: entry ? `${entry.wordCount} words` : "",
    });
  }

  return days;
});

const previousMonth = () => {
  currentMonth.value = new Date(
    Date.UTC(
      currentMonth.value.getUTCFullYear(),
      currentMonth.value.getUTCMonth() - 1,
      1,
    ),
  );
};

const nextMonth = () => {
  currentMonth.value = new Date(
    Date.UTC(
      currentMonth.value.getUTCFullYear(),
      currentMonth.value.getUTCMonth() + 1,
      1,
    ),
  );
};

const goToCurrentMonth = () => {
  const now = new Date();
  currentMonth.value = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );
};

const selectDay = (day: CalendarDay) => {
  if (day.isCurrentMonth) {
    emit("select", {
      date: day.date,
      hasEntry: day.hasEntry,
      entryId: day.entryId,
      isPast: day.isPast,
      isToday: day.isToday,
      isFuture: day.isFuture,
    });
  }
};

watch(
  currentMonth,
  (value) => {
    emit("monthChange", {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
    });
  },
  { immediate: true },
);
</script>
