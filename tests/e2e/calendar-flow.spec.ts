import { expect, test } from '@playwright/test'

interface AuthPayload {
  user: {
    id: string
    username: string
    email: string
  }
  token: string
}

function buildAuthPayload(): AuthPayload {
  const unique = Date.now()
  return {
    user: {
      id: `calendar-user-${unique}`,
      username: `calendar_user_${unique}`,
      email: `calendar_user_${unique}@example.com`
    },
    token: `calendar-token-${unique}`
  }
}

test('calendar supports month navigation and shows no-entry message for past empty days', async ({ page }) => {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  const nonTodayDay = now.getUTCDate() === 2 ? 3 : 2

  await page.route('**/api/entries**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/entries') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entries: [
          {
            id: 'existing-entry',
            content: 'Entry from a previous submission',
            word_count: 5,
            created_at: `${String(currentYear).padStart(4, '0')}-${String(currentMonth).padStart(2, '0')}-${String(nonTodayDay).padStart(2, '0')}T12:00:00.000Z`,
            updated_at: `${String(currentYear).padStart(4, '0')}-${String(currentMonth).padStart(2, '0')}-${String(nonTodayDay).padStart(2, '0')}T12:00:00.000Z`
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    })
  })

  await page.route('**/api/entries/dates**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('year'))
    const month = Number(url.searchParams.get('month'))

    const isCurrentMonth = year === currentYear && month === currentMonth

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        month: { year, month },
        days: isCurrentMonth
          ? [
              {
                date: `${String(currentYear).padStart(4, '0')}-${String(currentMonth).padStart(2, '0')}-10`,
                entryId: 'entry-current-month',
                wordCount: 42,
                hasReview: true
              }
            ]
          : [],
        streak: isCurrentMonth ? 4 : 1
      })
    })
  })

  await page.addInitScript((auth) => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(auth))
  }, buildAuthPayload())

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)

  await expect(page.getByRole('button', { name: 'Turn off distraction free mode' })).toBeVisible()
  await page.getByRole('button', { name: 'Turn off distraction free mode' }).click()

  await expect(page.getByText('4 day streak')).toBeVisible()

  await page.getByRole('button', { name: 'Previous month' }).click()
  await expect(page.getByText('1 day streak')).toBeVisible()

  const firstActiveDay = page.locator('button.calendar-day:not([disabled])').first()
  await firstActiveDay.click()

  await expect(page.getByText('No entry for this day.')).toBeVisible()

  await page.getByRole('button', { name: 'Today' }).click()
  await expect(page.getByText('4 day streak')).toBeVisible()
})

test('calendar day with an entry opens that entry in the editor', async ({ page }) => {
  const now = new Date()
  const currentYear = now.getUTCFullYear()
  const currentMonth = now.getUTCMonth() + 1
  const todayDay = now.getUTCDate()

  const selectedDate = `${String(currentYear).padStart(4, '0')}-${String(currentMonth).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`
  const selectedEntryText = 'Questo e un testo dal calendario.'

  await page.route('**/api/entries**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/entries') {
      await route.fallback()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        entries: [
          {
            id: 'existing-entry',
            content: 'Entry from a previous submission',
            word_count: 5,
            created_at: `${selectedDate}T11:00:00.000Z`,
            updated_at: `${selectedDate}T11:00:00.000Z`
          }
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1
        }
      })
    })
  })

  await page.route('**/api/entries/entry-from-calendar**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'entry-from-calendar',
        content: selectedEntryText,
        word_count: 7,
        created_at: `${selectedDate}T12:00:00.000Z`,
        updated_at: `${selectedDate}T12:00:00.000Z`
      })
    })
  })

  await page.route('**/api/entries/dates**', async (route) => {
    const url = new URL(route.request().url())
    const year = Number(url.searchParams.get('year'))
    const month = Number(url.searchParams.get('month'))

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        month: { year, month },
        days: [
          {
            date: selectedDate,
            entryId: 'entry-from-calendar',
            wordCount: 7,
            hasReview: false
          }
        ],
        streak: 2
      })
    })
  })

  await page.addInitScript((auth) => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(auth))
  }, buildAuthPayload())

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/dashboard$/)

  const entryDayButton = page.locator('button.calendar-day[title="7 words"]:not([disabled])')
  await expect(entryDayButton).toBeVisible()
  await entryDayButton.click()

  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible()
  await expect(page.locator('textarea').first()).toHaveValue(selectedEntryText)
})
