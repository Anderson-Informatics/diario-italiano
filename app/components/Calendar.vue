<template>
  <div class="bg-white rounded-xl shadow-sm p-4 sm:p-6">
    <div class="flex flex-wrap justify-between items-center gap-2 mb-4">
      <h2 class="text-lg font-semibold text-gray-800">📅 {{ monthYear }}</h2>
      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          @click="goToCurrentMonth"
          class="min-h-10 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          Today
        </button>
        <button
          @click="previousMonth"
          class="min-h-10 min-w-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          &larr;
        </button>
        <button
          @click="nextMonth"
          class="min-h-10 min-w-10 p-2 hover:bg-gray-100 rounded-lg transition-colors"
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
        class="text-center text-xs sm:text-sm font-medium text-gray-500"
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
import {
  daysInMonth,
  formatMonthYear,
  getCurrentYearMonthInTimeZone,
  getTodayKeyInTimeZone,
  keyFromParts,
  weekdayOfFirstDay,
} from "../utils/timezone";

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
  timezone?: string;
}

const props = withDefaults(defineProps<Props>(), {
  entryDays: () => ({}),
  streak: 0,
  loading: false,
  timezone: "UTC",
});

const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const currentMonth = ref(getCurrentYearMonthInTimeZone(props.timezone));

const emit = defineEmits<{
  select: [payload: CalendarSelectionPayload];
  monthChange: [payload: CalendarMonthChangePayload];
}>();

const monthYear = computed(() => {
  return formatMonthYear(
    currentMonth.value.year,
    currentMonth.value.month,
    props.timezone,
  );
});

const calendarDays = computed(() => {
  const year = currentMonth.value.year;
  const month = currentMonth.value.month;

  const firstDayOfWeek = weekdayOfFirstDay(year, month);
  const prevMonthYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevMonthDays = daysInMonth(prevMonthYear, prevMonth);
  const lastDate = daysInMonth(year, month);

  const days: CalendarDay[] = [];
  const todayKey = getTodayKeyInTimeZone(props.timezone);

  // Add previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const dayKey = keyFromParts(prevMonthYear, prevMonth, prevMonthDays - i);
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
    const dayKey = keyFromParts(year, month, i);
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
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  for (let i = 1; i <= remainingDays; i++) {
    const dayKey = keyFromParts(nextMonthYear, nextMonth, i);
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
  if (currentMonth.value.month === 1) {
    currentMonth.value = { year: currentMonth.value.year - 1, month: 12 };
    return;
  }

  currentMonth.value = {
    year: currentMonth.value.year,
    month: currentMonth.value.month - 1,
  };
};

const nextMonth = () => {
  if (currentMonth.value.month === 12) {
    currentMonth.value = { year: currentMonth.value.year + 1, month: 1 };
    return;
  }

  currentMonth.value = {
    year: currentMonth.value.year,
    month: currentMonth.value.month + 1,
  };
};

const goToCurrentMonth = () => {
  currentMonth.value = getCurrentYearMonthInTimeZone(props.timezone);
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
      year: value.year,
      month: value.month,
    });
  },
  { immediate: true },
);

watch(
  () => props.timezone,
  () => {
    currentMonth.value = getCurrentYearMonthInTimeZone(props.timezone);
  },
);
</script>
