import { expect, test } from '@playwright/test'
import { edit, openShed } from './workshop'
import oldWorkshop from './fixtures/v2-workshop.json'

test('a saved workshop starts in the shed and keeps its original controller files', async ({ page }) => {
  // Migration is the one case whose starting input predates the current UI.
  await page.addInitScript(save => {
    if (!localStorage.getItem('inherit.workshop.v1')) localStorage.setItem('inherit.workshop.v1', save)
  }, JSON.stringify(oldWorkshop))
  await openShed(page)
  await expect(page.getByTestId('task-card')).toContainText('Pick up a rock')
  await page.reload()
  await page.getByRole('button', { name: 'History' }).click()
  await page.getByRole('button', { name: 'Open v2 code' }).click()
  await expect(page.locator('.view-lines')).toContainText('from "./feed"')
  await expect(page.getByTestId('primary-button')).toContainText('Run')
})

test('a stopped controller keeps Deploy available and a revision restores the clock', async ({ page }) => {
  await openShed(page, '?step=bram-loop')
  const primary = page.getByTestId('primary-button')
  await edit(page, 'export function onTick() { console.log("ticking") }')
  await primary.click()
  await expect(page.locator('.live')).toHaveText('Live')
  await edit(page, 'export function onTick() {\n  throw new Error("Valve closed")\n}')
  await page.keyboard.press('Control+Enter')
  await expect(page.getByTestId('checks')).toContainText('main.ts:2 · Valve closed')
  await expect(page.locator('.live')).toHaveText('Offline')
  await expect(primary).toContainText('Deploy')
  await page.getByRole('button', { name: 'Deploy history' }).click()
  await page.getByRole('button', { name: /Restore #1 / }).click()
  await expect(page.locator('.live')).toHaveText('Live')
  await expect(page.locator('.view-lines')).toContainText('ticking')
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'New game' }).click()
  await page.getByRole('button', { name: 'Keep playing' }).click()
  await expect(primary).toContainText('Deploy')
})

test('a missing worker refreshes once and preserves the draft', async ({ page }) => {
  await openShed(page)
  await edit(page, 'take("mine")', true)
  let attempts = 0
  await page.route('**/_nuxt/builds/latest.json*', route => route.fulfill({ json: { id: 'new-factory-build' } }))
  await page.route('**/_nuxt/runner.worker-*.js', route =>
    ++attempts === 1 ? route.fulfill({ status: 404, body: 'Not found' }) : route.continue())
  await page.reload()
  await expect.poll(() => attempts).toBe(2)
  await expect(page.getByTestId('primary-button')).toBeEnabled()
  await expect(page.locator('.view-lines')).toContainText('take("mine")')
})

test.describe('a high-density mobile display', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
  test('panels stack beneath an inspectable floor', async ({ page }) => {
    await openShed(page)
    const canvas = page.locator('.pixi-mount canvas')
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth)).toBe(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    await page.getByRole('button', { name: 'Inspect furnace' }).tap()
    await expect(page.getByRole('region', { name: 'Machine inspector' })).toBeVisible()
  })
})

test('a machine remembers the helper lines that actually commanded it', async ({ page }) => {
  await openShed(page, '?step=bram-loop')
  await edit(page, 'import { take } from "inherit"\nfunction morning() { take("mine") }\nfunction evening() { take("mine") }\nexport function onTick() { morning(); evening() }')
  await page.getByTestId('primary-button').click()
  await page.getByRole('button', { name: 'Inspect mine' }).click()
  const inspector = page.getByRole('region', { name: 'Machine inspector' })
  await expect(inspector).toContainText('morning · main.ts:2')
  await inspector.getByRole('button', { name: 'evening · main.ts:3' }).click()
  await expect(page.getByRole('textbox', { name: 'Factory controller TypeScript' })).toBeFocused()
})

test('Run retries an unavailable worker when the manifest is offline', async ({ page }) => {
  let failed = false
  await page.route('**/_nuxt/builds/latest.json*', route => route.fulfill({ status: 503, body: '' }))
  await page.route('**/_nuxt/runner.worker-*.js', route => {
    if (failed) return route.continue()
    failed = true
    return route.abort()
  })
  await page.goto('/')
  await expect(page.getByTestId('checks')).toContainText('Could not start the controller worker')
  await edit(page, 'take("mine")', true)
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('solved-card')).toContainText('Done')
})
