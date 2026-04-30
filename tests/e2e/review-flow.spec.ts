import { expect, test } from '@playwright/test'

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

test('user can submit entry, see review, and reload persisted review', async ({ page, request }) => {
  await page.route('**/api/review', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_REVIEW)
    })
  })

  const unique = Date.now()
  const username = `e2e_user_${unique}`
  const email = `${username}@example.com`
  const password = 'password123'
  const entryText = 'Ieri io mangiava una pizza molto buono.'

  const registerResponse = await request.post('/api/auth/register', {
    data: { username, email, password }
  })
  expect(registerResponse.ok()).toBeTruthy()

  const loginResponse = await request.post('/api/auth/login', {
    data: { usernameOrEmail: username, password }
  })
  expect(loginResponse.ok()).toBeTruthy()
  const loginData = await loginResponse.json()

  await page.addInitScript(auth => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(auth))
  }, {
    user: loginData.user,
    token: loginData.token
  })

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

  await page.reload()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Entry History')).toBeVisible()

  const entryCard = page.getByText(entryText).first()
  await expect(entryCard).toBeVisible()
  await entryCard.click()

  await expect(page.getByText('Corrections (1)')).toBeVisible()
  await expect(page.getByText('Estimated CEFR Level')).toBeVisible()
  await expect(page.getByText('80% confidence', { exact: true })).toBeVisible()
})

test('user sees review error state when AI service fails', async ({ page, request }) => {
  await page.route('**/api/review', async route => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'AI review service is unavailable' })
    })
  })

  const unique = Date.now()
  const username = `e2e_fail_user_${unique}`
  const email = `${username}@example.com`
  const password = 'password123'
  const entryText = 'Oggi io andava al mercato.'

  const registerResponse = await request.post('/api/auth/register', {
    data: { username, email, password }
  })
  expect(registerResponse.ok()).toBeTruthy()

  const loginResponse = await request.post('/api/auth/login', {
    data: { usernameOrEmail: username, password }
  })
  expect(loginResponse.ok()).toBeTruthy()
  const loginData = await loginResponse.json()

  await page.addInitScript(auth => {
    window.localStorage.setItem('italian-journal-auth', JSON.stringify(auth))
  }, {
    user: loginData.user,
    token: loginData.token
  })

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

  await page.reload()
  await expect(page).toHaveURL(/\/dashboard$/)

  const entryCard = page.getByText(entryText).first()
  await expect(entryCard).toBeVisible()
  await entryCard.click()

  await expect(page.getByText('AI review service is unavailable')).not.toBeVisible()
})