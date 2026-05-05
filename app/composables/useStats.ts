import type { StatsDashboardResponse, TipInsight } from '../types'

export function useStats() {
  const range = ref<'week' | 'month' | 'all'>('month')

  const key = computed(() => `stats-dashboard-${range.value}`)

  const { data, pending, error, refresh } = useAsyncData(
    key,
    () => useAuthenticatedFetch<StatsDashboardResponse>('/api/stats/dashboard', {
      query: { range: range.value }
    }),
    {
      watch: [range],
      server: false
    }
  )

  const setRange = (nextRange: 'week' | 'month' | 'all') => {
    range.value = nextRange
  }

  const saveTip = async (tip: TipInsight) => {
    await useAuthenticatedFetch<{ tipId: string; saved: boolean }>('/api/stats/tips', {
      method: 'POST',
      body: {
        tip: tip.tip,
        type: tip.type,
        reference_link: tip.reference_link,
        original: tip.original,
        corrected: tip.corrected
      }
    })

    await refresh()
  }

  const removeTip = async (tipId: string) => {
    await useAuthenticatedFetch('/api/stats/tips/' + tipId, {
      method: 'DELETE'
    })

    await refresh()
  }

  return {
    range,
    data,
    pending,
    error,
    refresh,
    setRange,
    saveTip,
    removeTip
  }
}
