<template>
  <div class="bg-white rounded-xl shadow-sm p-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-lg font-semibold text-gray-800">📅 {{ monthYear }}</h2>
      <div class="flex space-x-2">
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
          day.hasEntry ? 'has-entry' : ''
        ]"
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
interface CalendarDay {
  date: string
  dayNumber: number
  isCurrentMonth: boolean
  isToday: boolean
  hasEntry: boolean
}

const weekdays = ['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do']
const currentMonth = ref(new Date())
const streak = ref(5)

const monthYear = computed(() => {
  return currentMonth.value.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  })
})

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear()
  const month = currentMonth.value.getMonth()
  
  // Get first day of month (0 = Sunday in JS, we need Monday = 1)
  const firstDay = new Date(year, month, 1)
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7 // Convert to Monday-based
  
  // Get last day of previous month
  const prevMonth = new Date(year, month, 0)
  const prevMonthDays = prevMonth.getDate()
  
  // Get last day of current month
  const lastDay = new Date(year, month + 1, 0)
  const lastDate = lastDay.getDate()
  
  const days: CalendarDay[] = []
  const today = new Date()
  const todayStr = today.toDateString()
  
  // Add previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonthDays - i)
    days.push({
      date: date.toISOString(),
      dayNumber: prevMonthDays - i,
      isCurrentMonth: false,
      isToday: false,
      hasEntry: Math.random() > 0.8 // Placeholder
    })
  }
  
  // Add current month days
  for (let i = 1; i <= lastDate; i++) {
    const date = new Date(year, month, i)
    days.push({
      date: date.toISOString(),
      dayNumber: i,
      isCurrentMonth: true,
      isToday: date.toDateString() === todayStr,
      hasEntry: Math.random() > 0.6 // Placeholder
    })
  }
  
  // Add next month days to fill the grid
  const remainingDays = 42 - days.length
  for (let i = 1; i <= remainingDays; i++) {
    const date = new Date(year, month + 1, i)
    days.push({
      date: date.toISOString(),
      dayNumber: i,
      isCurrentMonth: false,
      isToday: false,
      hasEntry: false
    })
  }
  
  return days
})

const previousMonth = () => {
  currentMonth.value = new Date(currentMonth.value.setMonth(currentMonth.value.getMonth() - 1))
}

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.setMonth(currentMonth.value.getMonth() + 1))
}

const selectDay = (day: CalendarDay) => {
  if (day.isCurrentMonth) {
    // Emit event for day selection
    emit('select', new Date(day.date))
  }
}

const emit = defineEmits<{
  select: [date: Date]
}>()
</script>