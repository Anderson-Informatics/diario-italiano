import OpenAI from 'openai'
import type { Review } from '../../app/types/index'

export const MAX_REVIEW_TEXT_LENGTH = 5000

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
      "reference_link": "string — a URL to an authoritative Italian grammar resource explaining this rule (only for grammar type errors; omit or null for others)"
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
  }
}

Rules:
- If the text has no errors, return an empty corrections array and stats all zero.
- Only flag genuine Italian language errors, not stylistic preferences.
- reference_link must be a real, stable URL (e.g. from treccani.it, grammaticaitaliana.it, or italian.stackexchange.com). Only include for grammar errors.
- Keep tips concise (1–2 sentences).
- Provide 1–3 recommendations in cefrLevel.recommendations.
- Return ONLY the JSON object, no markdown, no extra text.`

export function buildReviewUserPrompt(text: string): string {
  return `Please review the following Italian text:\n\n${text}`
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
  const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
  if (!validLevels.includes(cefrLevel.estimated as string)) return false
  if (typeof cefrLevel.confidence !== 'number') return false
  if (!Array.isArray(cefrLevel.recommendations)) return false

  return true
}

interface GenerateReviewOptions {
  apiKey: string
  model: string
  client?: OpenAI
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
        { role: 'user', content: buildReviewUserPrompt(text.trim()) }
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

  return parsed
}