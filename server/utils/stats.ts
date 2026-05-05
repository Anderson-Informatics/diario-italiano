import crypto from 'node:crypto'
import { JournalEntry } from '../models/JournalEntry'
import {
  createDayKeyGetter,
  datePartsToDayKey,
  getDatePartsInTimeZone,
  getStartOfDayUTCInTimeZoneFromParts,
  shiftDatePartsByDays
} from './timezone'

const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const LEGACY_CORRECTION_TYPES = ['grammar', 'spelling', 'vocabulary'] as const
const EXTENDED_CORRECTION_TYPES = ['punctuation', 'idiomatic', 'register'] as const
const ALL_CORRECTION_TYPES = [...LEGACY_CORRECTION_TYPES, ...EXTENDED_CORRECTION_TYPES] as const

type CEFROrder = (typeof CEFR_ORDER)[number]
type CorrectionType = (typeof ALL_CORRECTION_TYPES)[number]

export type StatsRange = 'week' | 'month' | 'all'

interface SavedTip {
  tipId: string
  tip: string
  type: CorrectionType
  reference_link?: string
  original?: string
  corrected?: string
  savedAt: Date
}

interface LeanEntry {
  content: string
  word_count?: number
  created_at: Date
  review?: {
    corrections: Array<{
      original: string
      corrected: string
      type: CorrectionType
      tip?: string
      reference_link?: string
    }>
    stats: {
      total_errors: number
      grammar: number
      spelling: number
      vocabulary: number
      punctuation?: number
      idiomatic?: number
      register?: number
      error_rate?: number
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

function createEmptyTypeTotals(): Record<CorrectionType, number> {
  return {
    grammar: 0,
    spelling: 0,
    vocabulary: 0,
    punctuation: 0,
    idiomatic: 0,
    register: 0
  }
}

function deriveCountsFromCorrections(entry: LeanEntry): Record<CorrectionType, number> {
  const totals = createEmptyTypeTotals()
  for (const correction of entry.review?.corrections ?? []) {
    totals[correction.type] += 1
  }
  return totals
}

function getNormalizedStats(entry: LeanEntry) {
  const stats = entry.review?.stats
  if (!stats) {
    return {
      total_errors: 0,
      ...createEmptyTypeTotals()
    }
  }

  const derived = deriveCountsFromCorrections(entry)

  const totals = createEmptyTypeTotals()
  totals.grammar = Math.max(stats.grammar ?? 0, derived.grammar)
  totals.spelling = Math.max(stats.spelling ?? 0, derived.spelling)
  totals.vocabulary = Math.max(stats.vocabulary ?? 0, derived.vocabulary)
  totals.punctuation = Math.max(stats.punctuation ?? 0, derived.punctuation)
  totals.idiomatic = Math.max(stats.idiomatic ?? 0, derived.idiomatic)
  totals.register = Math.max(stats.register ?? 0, derived.register)

  const totalFromBuckets = ALL_CORRECTION_TYPES.reduce((acc, type) => acc + totals[type], 0)

  return {
    total_errors: Math.max(stats.total_errors ?? 0, totalFromBuckets),
    ...totals
  }
}

interface ReviewedEntryContext {
  entry: LeanEntry
  normalizedStats: ReturnType<typeof getNormalizedStats>
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
  const getDayKey = createDayKeyGetter(timeZone)
  const completedDayKeys = new Set(
    entries
      .filter((entry) => Boolean(entry.review))
      .map((entry) => getDayKey(new Date(entry.created_at)))
  )

  if (completedDayKeys.size === 0) {
    return 0
  }

  let streak = 0
  const todayParts = getDatePartsInTimeZone(new Date(), timeZone)
  const todayKey = datePartsToDayKey(todayParts)
  let cursorParts = completedDayKeys.has(todayKey) ? todayParts : shiftDatePartsByDays(todayParts, -1)

  while (completedDayKeys.has(datePartsToDayKey(cursorParts))) {
    streak += 1
    cursorParts = shiftDatePartsByDays(cursorParts, -1)
  }

  return streak
}

function calculateErrorRate(errors: number, wordCount: number): number {
  if (wordCount === 0) {
    return 0
  }
  return Math.round((errors / wordCount) * 10000) / 100 // Per 100 words, rounded to 2 decimals
}

function computeImprovementRate(reviewedEntries: ReviewedEntryContext[]): number {
  if (reviewedEntries.length < 2) {
    return 0
  }

  // Build per-entry error rates (y) indexed chronologically (x = 0, 1, 2, ...)
  const rates = reviewedEntries.map((context) =>
    calculateErrorRate(context.normalizedStats.total_errors, context.entry.word_count ?? 0)
  )

  const n = rates.length
  const meanY = rates.reduce((sum, r) => sum + r, 0) / n

  if (meanY === 0) {
    return 0
  }

  // OLS slope: β = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumX2 = 0

  for (let i = 0; i < n; i++) {
    sumX += i
    sumY += rates[i]
    sumXY += i * rates[i]
    sumX2 += i * i
  }

  const denom = n * sumX2 - sumX * sumX
  if (denom === 0) {
    return 0
  }

  const slope = (n * sumXY - sumX * sumY) / denom

  // Negative slope = improving. Scale relative to mean rate so the result is a percentage.
  return Math.round((-slope / meanY) * 100)
}

function getMostCommonErrorType(reviewedEntries: ReviewedEntryContext[]): CorrectionType | 'none' {
  const totals = createEmptyTypeTotals()

  for (const entry of reviewedEntries) {
    for (const type of ALL_CORRECTION_TYPES) {
      totals[type] += entry.normalizedStats[type]
    }
  }

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
  if (!sorted[0] || sorted[0][1] === 0) {
    return 'none'
  }

  return sorted[0][0] as CorrectionType
}

function levelRank(level: string | undefined): number {
  if (!level) {
    return -1
  }

  return CEFR_ORDER.indexOf(level as CEFROrder)
}

function buildRecommendations(reviewedEntries: ReviewedEntryContext[]) {
  const totals = {
    grammar: 0,
    spelling: 0,
    vocabulary: 0,
    punctuation: 0
  }

  for (const entry of reviewedEntries) {
    totals.grammar += entry.normalizedStats.grammar
    totals.spelling += entry.normalizedStats.spelling
    totals.vocabulary += entry.normalizedStats.vocabulary
    totals.punctuation += entry.normalizedStats.punctuation
  }

  const recommendationMap: Record<'grammar' | 'spelling' | 'vocabulary' | 'punctuation', { area: string; suggestion: string; examples: string[]; resourceLink: string }> = {
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
    },
    punctuation: {
      area: 'Punctuation and spacing',
      suggestion: 'Review comma spacing and sentence punctuation in short editing passes.',
      examples: ['Ciao, come stai?', 'Ieri ho studiato, poi sono uscito.'],
      resourceLink: 'https://www.treccani.it/enciclopedia/punteggiatura/'
    }
  }

  return (Object.entries(totals) as Array<['grammar' | 'spelling' | 'vocabulary' | 'punctuation', number]>)
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
  const getDayKey = createDayKeyGetter(timeZone)
  const reviewedEntryContexts = reviewedEntries.map((entry) => ({
    entry,
    normalizedStats: getNormalizedStats(entry)
  }))
  const savedTipIds = new Set(savedTips.map((tip) => tip.tipId))

  let totalErrors = 0
  let totalGrammar = 0
  let totalSpelling = 0
  let totalVocabulary = 0
  let totalPunctuation = 0
  let totalIdiomatic = 0
  let totalRegister = 0
  let totalWordCount = 0

  const trendByDay = new Map<string, { errors: number; wordCount: number }>()
  const tips = [] as Array<{
    tipId: string
    type: CorrectionType
    tip: string
    original: string
    corrected: string
    reference_link?: string
    isSaved: boolean
  }>
  const cefrProgression = [] as Array<{ date: string; level: string; confidence: number }>

  for (const context of reviewedEntryContexts) {
    const { entry, normalizedStats } = context
    const day = getDayKey(new Date(entry.created_at))

    totalErrors += normalizedStats.total_errors
    totalGrammar += normalizedStats.grammar
    totalSpelling += normalizedStats.spelling
    totalVocabulary += normalizedStats.vocabulary
    totalPunctuation += normalizedStats.punctuation
    totalIdiomatic += normalizedStats.idiomatic
    totalRegister += normalizedStats.register
    totalWordCount += entry.word_count ?? 0

    const current = trendByDay.get(day) ?? { errors: 0, wordCount: 0 }
    trendByDay.set(day, {
      errors: current.errors + normalizedStats.total_errors,
      wordCount: current.wordCount + (entry.word_count ?? 0)
    })

    tips.push(...(entry.review?.corrections ?? [])
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
      }))

    if (entry.review?.cefrLevel.estimated) {
      cefrProgression.push({
        date: day,
        level: entry.review.cefrLevel.estimated,
        confidence: entry.review.cefrLevel.confidence ?? 0
      })
    }
  }

  const uniqueTips = Array.from(new Map(tips.map((tip) => [tip.tipId, tip])).values())

  const latestLevel = cefrProgression.at(-1)?.level ?? 'A1'
  const priorLevel = cefrProgression.length > 1 ? (cefrProgression.at(-2)?.level ?? latestLevel) : latestLevel

  return {
    range,
    reviewedEntriesCount: reviewedEntries.length,
    hasEnoughData: reviewedEntries.length >= 3,
    summary: {
      entriesWritten: entries.length,
      averageErrorRate: calculateErrorRate(totalErrors, totalWordCount),
      improvementRate: computeImprovementRate(reviewedEntryContexts),
      currentStreak: computeStreak(entries, timeZone)
    },
    monthlySummary: {
      mostCommonErrorType: getMostCommonErrorType(reviewedEntryContexts),
      cefrCurrent: latestLevel,
      cefrPrevious: priorLevel,
      cefrDelta: levelRank(latestLevel) - levelRank(priorLevel)
    },
    errorDistribution: {
      grammar: totalGrammar,
      spelling: totalSpelling,
      vocabulary: totalVocabulary,
      punctuation: totalPunctuation,
      idiomatic: totalIdiomatic,
      register: totalRegister,
      total: totalErrors,
      grammarRate: calculateErrorRate(totalGrammar, totalWordCount),
      spellingRate: calculateErrorRate(totalSpelling, totalWordCount),
      vocabularyRate: calculateErrorRate(totalVocabulary, totalWordCount),
      punctuationRate: calculateErrorRate(totalPunctuation, totalWordCount),
      idiomaticRate: calculateErrorRate(totalIdiomatic, totalWordCount),
      registerRate: calculateErrorRate(totalRegister, totalWordCount),
      averageRate: calculateErrorRate(totalErrors, totalWordCount)
    },
    errorTrend: Array.from(trendByDay.entries()).map(([date, { errors, wordCount }]) => ({
      date,
      total_errors: errors,
      error_rate: calculateErrorRate(errors, wordCount)
    })),
    cefrProgression,
    focusRecommendations: buildRecommendations(reviewedEntryContexts),
    tips: uniqueTips,
    savedTips: savedTips.map((tip) => ({
      ...tip,
      savedAt: tip.savedAt.toISOString()
    })),
    consistency: {
      datesWithEntries: Array.from(new Set(entries.map((entry) => getDayKey(new Date(entry.created_at))))).sort()
    }
  }
}
