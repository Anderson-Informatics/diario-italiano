import { expect, test, type Page } from '@playwright/test'

interface MockEntry {
  id: string
  content: string
  word_count: number
  review?: unknown
  created_at: string
  updated_at: string
}

interface AuthPayload {
  user: {
    id: string
    username: string
    email: string
    timezone: string
  }
  token: string
}

function countWords(content: string): number {
  const trimmed = content.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

function createAuthPayload(prefix: string): AuthPayload {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  return {
    user: {
      id: `${prefix}-id-${unique}`,
      username: `${prefix}-user-${unique}`,
      email: `${prefix}-${unique}@example.com`,
      timezone: 'UTC'
    },
    token: `${prefix}-token-${unique}`
  }
}

function createStatsDashboardResponse() {
  return {
    range: 'month' as const,
    reviewedEntriesCount: 0,
    hasEnoughData: false,
    summary: {
      entriesWritten: 0,
      averageErrorRate: 0,
      improvementRate: 0,
      currentStreak: 0
    },
    monthlySummary: {
      mostCommonErrorType: 'none' as const,
      cefrCurrent: 'A1',
      cefrPrevious: 'A1',
      cefrDelta: 0
    },
    errorDistribution: {
      grammar: 0,
      spelling: 0,
      vocabulary: 0,
      punctuation: 0,
      idiomatic: 0,
      register: 0,
      total: 0,
      averageRate: 0
    },
    errorTrend: [],
    cefrProgression: [],
    focusRecommendations: [],
    tips: [],
    savedTips: [],
    consistency: {
      datesWithEntries: []
    }
  }
}

async function registerReviewFlowRoutes(page: Page) {
  const entries: MockEntry[] = []
  let nextId = 1

  await page.route('**/api/stats/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(createStatsDashboardResponse())
    })
  })

  await page.route('**/api/entries**', async (route) => {
    const request = route.request()
    const method = request.method()
    const url = new URL(request.url())

    if (url.pathname === '/api/entries') {
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            entries,
            pagination: {
              page: 1,
              limit: 10,
              total: entries.length,
              totalPages: 1
            }
          })
        })
        return
      }

      if (method === 'POST') {
        const body = request.postDataJSON() as { content: string }
        const now = new Date().toISOString()
        const entry: MockEntry = {
          id: `entry-${nextId}`,
          content: body.content,
          word_count: countWords(body.content),
          created_at: now,
          updated_at: now
        }

        nextId += 1
        entries.unshift(entry)

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(entry)
        })
        return
      }
    }

    if (url.pathname === '/api/entries/dates') {
      const days = entries.map((entry) => ({
        date: entry.created_at.slice(0, 10),
        entryId: entry.id,
        wordCount: entry.word_count,
        hasReview: Boolean(entry.review)
      }))

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          month: {
            year: new Date().getUTCFullYear(),
            month: new Date().getUTCMonth() + 1
          },
          days,
          streak: days.some((day) => day.hasReview) ? 1 : 0
        })
      })
      return
    }

    if (url.pathname.startsWith('/api/entries/')) {
      const id = url.pathname.split('/').pop()
      const entry = entries.find((item) => item.id === id)

      if (!id || !entry) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Entry not found' })
        })
        return
      }

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(entry)
        })
        return
      }

      if (method === 'PUT') {
        const body = request.postDataJSON() as { content?: string; review?: unknown }

        if (body.content !== undefined) {
          entry.content = body.content
          entry.word_count = countWords(body.content)
        }

        if (body.review !== undefined) {
          entry.review = body.review
        }

        entry.updated_at = new Date().toISOString()

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(entry)
        })
        return
      }
    }

    await route.fulfill({
      status: 405,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Unsupported entries route in test mock' })
    })
  })
}

const MOCK_REVIEW = {
  corrected_text: 'Ieri ho mangiato una pizza molto buona.',
  corrections: [
    {
      original: 'Ieri io mangiava una pizza molto buono.',
      corrected: 'Ieri ho mangiato una pizza molto buona.',
      type: 'grammar',
      tip: 'Use passato prossimo with "ho" and agree adjective with feminine noun "pizza".',
      reference_link: 'https://www.treccani.it/enciclopedia/passato-prossimo/'
    }
  ],
  stats: {
    total_errors: 1,
    grammar: 1,
    spelling: 0,
    vocabulary: 0
  },
  cefrLevel: {
    estimated: 'A2',
    confidence: 80,
    recommendations: [
      {
        area: 'Passato prossimo',
        suggestion: 'Practice regular past participles with avere.',
        examples: ['Ho mangiato.', 'Ho guardato un film.']
      }
    ]
  }
}

test('user can submit entry, see review, and reload persisted review', async ({ page }) => {
  await registerReviewFlowRoutes(page)

  const auth = createAuthPayload('review-success')
  await page.addInitScript((payload) => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(payload))
  }, auth)

  await page.route('**/api/review', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REVIEW)
    })
  })

  const entryText = 'Ieri io mangiava una pizza molto buono.'

  await page.goto('/dashboard')

  await expect(page).toHaveURL(/\/dashboard$/)
  await page.waitForLoadState('networkidle')

  const editor = page.locator('textarea').first()
  await expect(editor).toBeVisible()
  await editor.click()
  await page.keyboard.type(entryText)
  await expect(page.getByText('7 words')).toBeVisible()

  const submitButton = page.getByRole('button', { name: 'Submit for Review' })
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect(page.getByText('Corrections (1)')).toBeVisible()
  await expect(page.getByText('Estimated CEFR Level')).toBeVisible()
  await expect(page.getByText('80% confidence', { exact: true })).toBeVisible()

  await expect(page.getByText('Entry History')).toBeVisible()

  const entryCard = page.getByText(entryText).first()
  await expect(entryCard).toBeVisible()
  await entryCard.click()

  await expect(page.getByText('Corrections (1)')).toBeVisible()
  await expect(page.getByText('Estimated CEFR Level')).toBeVisible()
  await expect(page.getByText('80% confidence', { exact: true })).toBeVisible()
})

test('user sees review error state when AI service fails', async ({ page }) => {
  await registerReviewFlowRoutes(page)

  const auth = createAuthPayload('review-failure')
  await page.addInitScript((payload) => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(payload))
  }, auth)

  await page.route('**/api/review', async route => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'AI review service is unavailable' })
    })
  })

  const entryText = 'Oggi io andava al mercato.'

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)
  await page.waitForLoadState('networkidle')

  const editor = page.locator('textarea').first()
  await expect(editor).toBeVisible()
  await editor.click()
  await page.keyboard.type(entryText)
  await expect(page.getByText('5 words')).toBeVisible()

  const submitButton = page.getByRole('button', { name: 'Submit for Review' })
  await expect(submitButton).toBeEnabled()
  await submitButton.click()

  await expect(page.getByText('AI review service is unavailable')).toBeVisible()
  await expect(page.getByText('Entry History')).toBeVisible()

  const entryCard = page.getByText(entryText).first()
  await expect(entryCard).toBeVisible()
  await entryCard.click()

  await expect(page.getByText('AI review service is unavailable')).not.toBeVisible()
})