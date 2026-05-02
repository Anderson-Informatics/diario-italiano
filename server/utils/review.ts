import OpenAI from 'openai'
import type { Review, WritingReviewPhase } from '../../app/types/index'

export const MAX_REVIEW_TEXT_LENGTH = 5000
const VALID_CORRECTION_TYPES = ['grammar', 'spelling', 'vocabulary'] as const
const VALID_CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
const VALID_WRITING_PHASES = ['A1-A2', 'B1-B2', 'C1-C2'] as const
const VALID_WRITING_DIMENSIONS = [
  'taskFulfillment',
  'organization',
  'grammarControl',
  'lexicalRange',
  'cohesion',
  'register'
] as const

export class ReviewError extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ReviewError'
    this.statusCode = statusCode
  }
}

const SYSTEM_PROMPT = `You are an expert Italian language teacher. Analyze the provided Italian text and return a structured JSON review.

Your response MUST be valid JSON matching this exact schema:
{
  "corrected_text": "string — the full corrected version of the input text",
  "corrections": [
    {
      "original": "string — the original incorrect text fragment",
      "corrected": "string — the corrected version",
      "type": "grammar" | "spelling" | "vocabulary",
      "tip": "string — a brief explanation in English of why this is wrong and how to remember the rule",
      "reference_link": "string — a URL to an authoritative Italian grammar resource explaining this rule (only for grammar type errors; omit or null for others)",
      "tags": ["string — optional short writing tags such as article usage, tense consistency, cohesion"]
    }
  ],
  "stats": {
    "total_errors": number,
    "grammar": number,
    "spelling": number,
    "vocabulary": number
  },
  "cefrLevel": {
    "estimated": "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    "confidence": number between 0 and 100,
    "recommendations": [
      {
        "area": "string — the grammatical or vocabulary area to focus on",
        "suggestion": "string — a specific actionable suggestion",
        "examples": ["string — example sentence or phrase"]
      }
    ]
  },
  "writing": {
    "phase": "A1-A2" | "B1-B2" | "C1-C2",
    "strengths": ["string — brief writing strengths in English"],
    "priorities": [
      {
        "title": "string — short label for the next writing target",
        "detail": "string — concise learner-friendly explanation in English"
      }
    ],
    "dimensionScores": [
      {
        "dimension": "taskFulfillment" | "organization" | "grammarControl" | "lexicalRange" | "cohesion" | "register",
        "score": number between 1 and 5,
        "rationale": "string — brief reason for the score"
      }
    ],
    "modelRewrite": "string — optional learner+1 rewrite of the full text",
    "followUpTask": {
      "prompt": "string — short writing practice prompt",
      "instructions": "string — one concise revision task"
    }
  }
}

Rules:
- If the text has no errors, return an empty corrections array and stats all zero.
- Only flag genuine Italian language errors, not stylistic preferences.
- reference_link must be a real, stable URL (e.g. from treccani.it, grammaticaitaliana.it, or italian.stackexchange.com). Only include for grammar errors.
- Keep tips concise (1–2 sentences).
- Provide 1–3 recommendations in cefrLevel.recommendations.
- Always include the writing object.
- Choose the writing.phase from the learner level implied by the text: A1-A2 for beginners, B1-B2 for intermediate writers, C1-C2 for advanced writers.
- For writing.strengths and writing.priorities, adapt scope by phase: A1-A2 returns exactly 2 strengths and at most 2 priorities; B1-B2 returns exactly 2 strengths and at most 3 priorities; C1-C2 returns 2-3 strengths and 2-3 priorities focused on nuance, register, and style.
- Surface meaning-blocking issues before stylistic issues.
- dimensionScores should cover 3 to 6 dimensions and keep scores realistic.
- Return ONLY the JSON object, no markdown, no extra text.`

export function buildReviewUserPrompt(text: string): string {
  return `Please review the following Italian text:\n\n${text}`
}

export function buildReviewPromptContext(text: string, learnerPhase?: WritingReviewPhase): string {
  if (!learnerPhase) {
    return buildReviewUserPrompt(text)
  }

  return `${buildReviewUserPrompt(text)}\n\nKnown learner phase: ${learnerPhase}. Keep the writing feedback aligned to this phase unless the text clearly proves the learner is far above or below it.`
}

export function isValidReview(data: unknown): data is Review {
  if (!data || typeof data !== 'object') return false
  const review = data as Record<string, unknown>

  if (typeof review.corrected_text !== 'string') return false
  if (!Array.isArray(review.corrections)) return false
  if (!review.stats || typeof review.stats !== 'object') return false
  if (!review.cefrLevel || typeof review.cefrLevel !== 'object') return false

  const stats = review.stats as Record<string, unknown>
  if (typeof stats.total_errors !== 'number') return false
  if (typeof stats.grammar !== 'number') return false
  if (typeof stats.spelling !== 'number') return false
  if (typeof stats.vocabulary !== 'number') return false

  const cefrLevel = review.cefrLevel as Record<string, unknown>
  if (!VALID_CEFR_LEVELS.includes(cefrLevel.estimated as (typeof VALID_CEFR_LEVELS)[number])) return false
  if (typeof cefrLevel.confidence !== 'number') return false
  if (!Array.isArray(cefrLevel.recommendations)) return false

  if (!review.corrections.every(isValidCorrection)) return false
  if (!cefrLevel.recommendations.every(isValidRecommendation)) return false

  if (review.writing !== undefined && !isValidWritingFeedback(review.writing)) return false

  return true
}

function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined
}

function isValidCorrection(correction: unknown): boolean {
  if (!correction || typeof correction !== 'object') return false

  const value = correction as Record<string, unknown>
  if (typeof value.original !== 'string') return false
  if (typeof value.corrected !== 'string') return false
  if (!VALID_CORRECTION_TYPES.includes(value.type as (typeof VALID_CORRECTION_TYPES)[number])) return false
  if (!isNullish(value.tip) && typeof value.tip !== 'string') return false
  if (!isNullish(value.reference_link) && typeof value.reference_link !== 'string') return false
  if (!isNullish(value.tags) && (!Array.isArray(value.tags) || !value.tags.every(tag => typeof tag === 'string'))) return false

  return true
}

function isValidRecommendation(recommendation: unknown): boolean {
  if (!recommendation || typeof recommendation !== 'object') return false

  const value = recommendation as Record<string, unknown>
  if (typeof value.area !== 'string') return false
  if (typeof value.suggestion !== 'string') return false
  if (!Array.isArray(value.examples) || !value.examples.every(example => typeof example === 'string')) return false

  return true
}

function isValidWritingFeedback(writing: unknown): boolean {
  if (!writing || typeof writing !== 'object') return false

  const value = writing as Record<string, unknown>
  if (!VALID_WRITING_PHASES.includes(value.phase as (typeof VALID_WRITING_PHASES)[number])) return false
  if (!Array.isArray(value.strengths) || !value.strengths.every(strength => typeof strength === 'string')) return false
  if (!Array.isArray(value.priorities) || !value.priorities.every(isValidPriority)) return false
  if (!Array.isArray(value.dimensionScores) || !value.dimensionScores.every(isValidDimensionScore)) return false
  if (!isNullish(value.modelRewrite) && typeof value.modelRewrite !== 'string') return false

  if (!isNullish(value.followUpTask)) {
    if (!value.followUpTask || typeof value.followUpTask !== 'object') return false

    const followUpTask = value.followUpTask as Record<string, unknown>
    if (typeof followUpTask.prompt !== 'string') return false
    if (typeof followUpTask.instructions !== 'string') return false
  }

  return true
}

function isValidPriority(priority: unknown): boolean {
  if (!priority || typeof priority !== 'object') return false

  const value = priority as Record<string, unknown>
  return typeof value.title === 'string' && typeof value.detail === 'string'
}

function isValidDimensionScore(score: unknown): boolean {
  if (!score || typeof score !== 'object') return false

  const value = score as Record<string, unknown>
  if (!VALID_WRITING_DIMENSIONS.includes(value.dimension as (typeof VALID_WRITING_DIMENSIONS)[number])) return false
  if (typeof value.score !== 'number' || value.score < 1 || value.score > 5) return false
  if (!isNullish(value.rationale) && typeof value.rationale !== 'string') return false

  return true
}

function normalizeCorrection(correction: Review['corrections'][number]): Review['corrections'][number] {
  return {
    original: correction.original,
    corrected: correction.corrected,
    type: correction.type,
    ...(typeof correction.tip === 'string' ? { tip: correction.tip } : {}),
    ...(typeof correction.reference_link === 'string' ? { reference_link: correction.reference_link } : {}),
    ...(Array.isArray(correction.tags) ? { tags: correction.tags } : {})
  }
}

function normalizeWritingFeedback(writing: Review['writing']): Review['writing'] {
  if (!writing) {
    return writing
  }

  return {
    phase: writing.phase,
    strengths: writing.strengths,
    priorities: writing.priorities,
    dimensionScores: writing.dimensionScores.map(score => ({
      dimension: score.dimension,
      score: score.score,
      ...(typeof score.rationale === 'string' ? { rationale: score.rationale } : {})
    })),
    ...(typeof writing.modelRewrite === 'string' ? { modelRewrite: writing.modelRewrite } : {}),
    ...(
      writing.followUpTask &&
      typeof writing.followUpTask.prompt === 'string' &&
      typeof writing.followUpTask.instructions === 'string'
        ? { followUpTask: writing.followUpTask }
        : {}
    )
  }
}

function normalizeReview(review: Review): Review {
  return {
    corrected_text: review.corrected_text,
    corrections: review.corrections.map(normalizeCorrection),
    stats: review.stats,
    cefrLevel: review.cefrLevel,
    ...(review.writing ? { writing: normalizeWritingFeedback(review.writing) } : {})
  }
}

interface GenerateReviewOptions {
  apiKey: string
  model: string
  client?: OpenAI
  learnerPhase?: WritingReviewPhase
}

export async function generateReview(text: string, options: GenerateReviewOptions): Promise<Review> {
  if (!text || text.trim().length === 0) {
    throw new ReviewError(400, 'text is required')
  }

  if (text.length > MAX_REVIEW_TEXT_LENGTH) {
    throw new ReviewError(400, `text must not exceed ${MAX_REVIEW_TEXT_LENGTH} characters`)
  }

  if (!options.apiKey) {
    throw new ReviewError(503, 'AI review service is not configured')
  }

  const client = options.client ?? new OpenAI({ apiKey: options.apiKey })

  let rawContent: string | null
  try {
    const completion = await client.chat.completions.create({
      model: options.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildReviewPromptContext(text.trim(), options.learnerPhase) }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2
    })
    rawContent = completion.choices[0]?.message?.content ?? null
  } catch {
    throw new ReviewError(503, 'AI review service is unavailable')
  }

  if (!rawContent) {
    throw new ReviewError(502, 'AI service returned an empty response')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawContent)
  } catch {
    throw new ReviewError(502, 'AI service returned an invalid response')
  }

  if (!isValidReview(parsed)) {
    throw new ReviewError(502, 'AI service returned an unexpected response structure')
  }

  return normalizeReview(parsed)
}