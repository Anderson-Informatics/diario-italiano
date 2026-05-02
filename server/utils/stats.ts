import crypto from 'node:crypto'
import { JournalEntry } from '../models/JournalEntry'
import {
  datePartsToDayKey,
  getDatePartsInTimeZone,
  getDayKeyInTimeZone,
  getStartOfDayUTCInTimeZoneFromParts,
  shiftDatePartsByDays
} from './timezone'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

type CEFROrder = (typeof CEFR_ORDER)[number]

export type StatsRange = 'week' | 'month' | 'all'

interface SavedTip {
  tipId: string
  tip: string
  type: 'grammar' | 'spelling' | 'vocabulary'
  reference_link?: string
  original?: string
  corrected?: string
  savedAt: Date
}

interface LeanEntry {
  content: string
  created_at: Date
  review?: {
    corrections: Array<{
      original: string
      corrected: string
      type: 'grammar' | 'spelling' | 'vocabulary'
      tip?: string
      reference_link?: string
    }>
    stats: {
      total_errors: number
      grammar: number
      spelling: number
      vocabulary: number
    }
    cefrLevel: {
      estimated: string
      confidence: number
      recommendations: Array<{
        area: string
        suggestion: string
        examples: string[]
      }>
    }
  }
}

function getRangeStart(range: StatsRange, timeZone: string): Date | null {
  if (range === 'all') {
    return null
  }

  const todayParts = getDatePartsInTimeZone(new Date(), timeZone)
  const daysToSubtract = range === 'week' ? 6 : 29
  const rangeStartParts = shiftDatePartsByDays(todayParts, -daysToSubtract)

  return getStartOfDayUTCInTimeZoneFromParts(rangeStartParts, timeZone)
}

function computeStreak(entries: LeanEntry[], timeZone: string): number {
  const dayKeys = new Set(entries.map((entry) => getDayKeyInTimeZone(new Date(entry.created_at), timeZone)))
  if (dayKeys.size === 0) {
    return 0
  }

  let streak = 0
  let cursorParts = getDatePartsInTimeZone(new Date(), timeZone)

  while (dayKeys.has(datePartsToDayKey(cursorParts))) {
    streak += 1
    cursorParts = shiftDatePartsByDays(cursorParts, -1)
  }

  return streak
}

function computeImprovementRate(reviewedEntries: LeanEntry[]): number {
  if (reviewedEntries.length < 2) {
    return 0
  }

  const splitIndex = Math.floor(reviewedEntries.length / 2)
  const firstHalf = reviewedEntries.slice(0, splitIndex)
  const secondHalf = reviewedEntries.slice(splitIndex)

  const firstAvg = firstHalf.reduce((acc, entry) => acc + (entry.review?.stats.total_errors ?? 0), 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((acc, entry) => acc + (entry.review?.stats.total_errors ?? 0), 0) / secondHalf.length

  if (firstAvg === 0) {
    return 0
  }

  return Math.round(((firstAvg - secondAvg) / firstAvg) * 100)
}

function getMostCommonErrorType(reviewedEntries: LeanEntry[]): 'grammar' | 'spelling' | 'vocabulary' | 'none' {
  const totals = {
    grammar: 0,
    spelling: 0,
    vocabulary: 0
  }

  for (const entry of reviewedEntries) {
    totals.grammar += entry.review?.stats.grammar ?? 0
    totals.spelling += entry.review?.stats.spelling ?? 0
    totals.vocabulary += entry.review?.stats.vocabulary ?? 0
  }

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (!sorted[0] || sorted[0][1] === 0) {
    return 'none'
  }

  return sorted[0][0] as 'grammar' | 'spelling' | 'vocabulary'
}

function levelRank(level: string | undefined): number {
  if (!level) {
    return -1
  }

  return CEFR_ORDER.indexOf(level as CEFROrder)
}

function buildRecommendations(reviewedEntries: LeanEntry[]) {
  const totals = {
    grammar: 0,
    spelling: 0,
    vocabulary: 0
  }

  for (const entry of reviewedEntries) {
    totals.grammar += entry.review?.stats.grammar ?? 0
    totals.spelling += entry.review?.stats.spelling ?? 0
    totals.vocabulary += entry.review?.stats.vocabulary ?? 0
  }

  const recommendationMap: Record<'grammar' | 'spelling' | 'vocabulary', { area: string; suggestion: string; examples: string[]; resourceLink: string }> = {
    grammar: {
      area: 'Grammar accuracy',
      suggestion: 'Practice tense agreement and article usage in short daily drills.',
      examples: ['Ieri ho mangiato con i miei amici.', 'La ragazza e il ragazzo sono arrivati presto.'],
      resourceLink: 'https://learnamo.com/en/italian-grammar/'
    },
    spelling: {
      area: 'Spelling and accents',
      suggestion: 'Review accent marks and double consonants with dictation exercises.',
      examples: ['perche -> perche', 'anno vs ano'],
      resourceLink: 'https://www.thoughtco.com/italian-spelling-rules-2011388'
    },
    vocabulary: {
      area: 'Vocabulary precision',
      suggestion: 'Replace literal translations with common Italian collocations.',
      examples: ['fare una doccia', 'prendere una decisione'],
      resourceLink: 'https://context.reverso.net/translation/'
    }
  }

  return (Object.entries(totals) as Array<['grammar' | 'spelling' | 'vocabulary', number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      ...recommendationMap[type],
      errorCount: count
    }))
}

function createTipId(input: { original: string; corrected: string; tip: string; type: string }): string {
  const raw = `${input.type}::${input.original}::${input.corrected}::${input.tip}`
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

export function buildTipIdForSave(input: { original: string; corrected: string; tip: string; type: string }): string {
  return createTipId(input)
}

export async function getDashboardStats(userId: string, range: StatsRange, savedTips: SavedTip[], timeZone: string) {
  const rangeStart = getRangeStart(range, timeZone)

  const query: Record<string, unknown> = { userId }
  if (rangeStart) {
    query.created_at = { $gte: rangeStart }
  }

  const entries = (await JournalEntry.find(query)
    .sort({ created_at: 1 })
    .lean()) as LeanEntry[]

  const reviewedEntries = entries.filter((entry) => entry.review)
  const savedTipIds = new Set(savedTips.map((tip) => tip.tipId))

  const totalErrors = reviewedEntries.reduce((acc, entry) => acc + (entry.review?.stats.total_errors ?? 0), 0)
  const totalGrammar = reviewedEntries.reduce((acc, entry) => acc + (entry.review?.stats.grammar ?? 0), 0)
  const totalSpelling = reviewedEntries.reduce((acc, entry) => acc + (entry.review?.stats.spelling ?? 0), 0)
  const totalVocabulary = reviewedEntries.reduce((acc, entry) => acc + (entry.review?.stats.vocabulary ?? 0), 0)

  const trendByDay = new Map<string, number>()
  for (const entry of reviewedEntries) {
    const day = getDayKeyInTimeZone(new Date(entry.created_at), timeZone)
    trendByDay.set(day, (trendByDay.get(day) ?? 0) + (entry.review?.stats.total_errors ?? 0))
  }

  const tips = reviewedEntries.flatMap((entry) => {
    return (entry.review?.corrections ?? [])
      .filter((correction) => correction.tip)
      .map((correction) => {
        const tipId = createTipId({
          original: correction.original,
          corrected: correction.corrected,
          tip: correction.tip || '',
          type: correction.type
        })

        return {
          tipId,
          type: correction.type,
          tip: correction.tip || '',
          original: correction.original,
          corrected: correction.corrected,
          reference_link: correction.reference_link,
          isSaved: savedTipIds.has(tipId)
        }
      })
  })

  const uniqueTips = Array.from(new Map(tips.map((tip) => [tip.tipId, tip])).values())

  const cefrProgression = reviewedEntries
    .filter((entry) => entry.review?.cefrLevel.estimated)
    .map((entry) => ({
      date: getDayKeyInTimeZone(new Date(entry.created_at), timeZone),
      level: entry.review?.cefrLevel.estimated ?? 'A1',
      confidence: entry.review?.cefrLevel.confidence ?? 0
    }))

  const latestLevel = cefrProgression.at(-1)?.level ?? 'A1'
  const priorLevel = cefrProgression.length > 1 ? (cefrProgression.at(-2)?.level ?? latestLevel) : latestLevel

  return {
    range,
    reviewedEntriesCount: reviewedEntries.length,
    hasEnoughData: reviewedEntries.length >= 3,
    summary: {
      entriesWritten: entries.length,
      averageErrorsPerEntry: reviewedEntries.length > 0 ? Number((totalErrors / reviewedEntries.length).toFixed(2)) : 0,
      improvementRate: computeImprovementRate(reviewedEntries),
      currentStreak: computeStreak(entries, timeZone)
    },
    monthlySummary: {
      mostCommonErrorType: getMostCommonErrorType(reviewedEntries),
      cefrCurrent: latestLevel,
      cefrPrevious: priorLevel,
      cefrDelta: levelRank(latestLevel) - levelRank(priorLevel)
    },
    errorDistribution: {
      grammar: totalGrammar,
      spelling: totalSpelling,
      vocabulary: totalVocabulary,
      total: totalErrors
    },
    errorTrend: Array.from(trendByDay.entries()).map(([date, total_errors]) => ({
      date,
      total_errors
    })),
    cefrProgression,
    focusRecommendations: buildRecommendations(reviewedEntries),
    tips: uniqueTips,
    savedTips: savedTips.map((tip) => ({
      ...tip,
      savedAt: tip.savedAt.toISOString()
    })),
    consistency: {
      datesWithEntries: Array.from(new Set(entries.map((entry) => getDayKeyInTimeZone(new Date(entry.created_at), timeZone)))).sort()
    }
  }
}
