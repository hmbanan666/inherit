import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

import { controller, solutions } from '../chapter-controllers'

async function setController(page: Page, source: string) {
  await page.locator('.monaco-editor .view-lines').first().click()
  await page.keyboard.press('Control+a')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((text) => navigator.clipboard.writeText(text), source)
  await page.keyboard.press('Control+v')
  await page.getByRole('button', { name: /^(Run|Restart)$/ }).click()
}
async function wire(page: Page, from: string, to: string) {
  await page
    .getByRole('button', { name: from + ' output', exact: true })
    .dragTo(page.getByRole('button', { name: to + ' input', exact: true }))
}
async function photo(page: Page, n: number) {
  await expect.poll(async () => Number(await page.locator('.rate strong').textContent())).toBeGreaterThan(0)
  await expect(page.locator('.phase')).toHaveText('Running')
  await expect(page.locator('.shipped')).toHaveCount(0)
  if (n === 2) await page.getByRole('button', { name: 'Inspect furnace-a' }).click()
  await page.mouse.move(0, 0)
  if (process.env.INHERIT_SHOTS) {
    await mkdir(process.env.INHERIT_SHOTS, { recursive: true })
    await page.screenshot({ path: join(process.env.INHERIT_SHOTS, 'level-' + n + '.png') })
  }
}
async function expectFifthFloorToFit(page: Page) {
  const floor = page.locator('.floor')
  await expect(floor.locator('.station')).toHaveCount(7)
  await expect
    .poll(() =>
      floor.evaluate((plan) => {
        const frame = plan.getBoundingClientRect()
        const boxes = [...plan.querySelectorAll('.station')].map((station) => {
          const parts = [...station.querySelectorAll('button, .machine-label, .machine-state')].map((part) =>
            part.getBoundingClientRect(),
          )
          return {
            name: station.querySelector('.machine-label')!.textContent,
            left: Math.min(...parts.map((p) => p.left)),
            right: Math.max(...parts.map((p) => p.right)),
            top: Math.min(...parts.map((p) => p.top)),
            bottom: Math.max(...parts.map((p) => p.bottom)),
          }
        })
        return boxes
          .filter(
            (b, i) =>
              b.left < frame.left ||
              b.right > frame.right ||
              b.top < frame.top ||
              b.bottom > frame.bottom ||
              boxes
                .slice(i + 1)
                .some((c) => b.left < c.right && b.right > c.left && b.top < c.bottom && b.bottom > c.top),
          )
          .map((b) => b.name)
      }),
    )
    .toEqual([])
}
test('write, build and ship the shed chapter', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'The shed', exact: true })).toBeVisible()
  await expect(page.locator('.phase')).toHaveText('Running')
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await page.getByRole('button', { name: '4×' }).click()
  await setController(page, solutions[0])
  await photo(page, 1)
  await expect(page.getByText('Order shipped', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.order-stamp')).toHaveText('SHIPPED')
  await expect(page.locator('.shipped small')).toHaveText(/\d+ ticks · \d+\/min · 5 lines of code/)
  if (process.env.INHERIT_SHOTS) {
    await page.screenshot({
      path: join(process.env.INHERIT_SHOTS, 'completion.png'),
      animations: 'disabled',
    })
  }
  await page.getByRole('button', { name: 'Next order' }).click()
  await expect(page.getByRole('heading', { name: 'Second furnace' })).toBeVisible()
  await wire(page, 'splitter', 'furnace-b')
  await setController(page, solutions[1])
  await photo(page, 2)
  await page.getByRole('button', { name: 'Next order' }).click({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Coal mine', exact: true }).click()
  await page.getByRole('button', { name: 'Place at 2, 4' }).click()
  await wire(page, 'coal-mine', 'press')
  await expect(page.locator('.floor-guide')).toContainText('coal-mine → press')
  await setController(page, solutions[2])
  await photo(page, 3)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Parts department' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inspect coal-mine' })).toBeVisible()
  await page.getByRole('button', { name: '4×' }).click()
  await page.getByRole('button', { name: 'Next order' }).click({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Loading bay' })).toBeVisible()
  await setController(page, solutions[3])
  await photo(page, 4)
  await expect(page.locator('.shipped p')).toContainText('Backpressure', { timeout: 20_000 })
  await page.getByRole('button', { name: 'Next order' }).click()
  await expect(page.getByRole('heading', { name: 'First real order' })).toBeVisible()
  await page.getByRole('button', { name: /^Hint/ }).click()
  await expect(page.locator('.note-copy')).toContainText('coal tally')
  await page.getByRole('button', { name: 'Close hint' }).click()
  await setController(page, solutions[4])
  await photo(page, 5)
  await expectFifthFloorToFit(page)
  await expect(page.locator('.shipped p')).toContainText('State', { timeout: 20_000 })
  await expect(page.locator('.chapter-count')).toHaveText('5 / 5 complete')
  if (process.env.INHERIT_SHOTS) {
    await page.screenshot({
      path: join(process.env.INHERIT_SHOTS, 'level-5-completion.png'),
      animations: 'disabled',
    })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.shipped p')).toBeInViewport({ ratio: 1 })
  await expectFifthFloorToFit(page)
  expect(errors).toEqual([])
})

test('Run recovers a missing worker after a redeploy and keeps the edited controller', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.phase')).toHaveText('Running')

  let reloads = 0
  await page.route('/', async (route) => {
    if (route.request().isNavigationRequest()) reloads++
    await route.continue()
  })
  await page.route('**/_nuxt/builds/latest.json*', (route) =>
    route.fulfill({ json: { id: 'next-build' } }),
  )
  await page.route('**/_nuxt/runner.worker-*.js', (route) =>
    reloads ? route.continue() : route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' }),
  )

  await setController(page, solutions[0]!)
  await expect.poll(() => reloads).toBe(1)
  await expect(page.locator('.phase')).toHaveText('Running')
  await expect(page.locator('.view-lines')).toContainText('ctx.work("furnace-a")')
  await expect.poll(async () => Number(await page.locator('.rate strong').textContent())).toBeGreaterThan(0)

  await setController(page, controller('  throw new Error("Valve closed")'))
  await expect(page.locator('.runtime[role=alert]')).toContainText('Valve closed')
  await expect(page.getByRole('button', { name: 'Run', exact: true })).toBeVisible()
  await setController(page, solutions[0]!)
  await expect(page.locator('.runtime[role=alert]')).toHaveCount(0)
  await expect.poll(async () => Number(await page.locator('.rate strong').textContent())).toBeGreaterThan(0)
  expect(reloads).toBe(1)
})

test('editor checks factory types, suggests commands and recovers from a stopped handler', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.phase')).toHaveText('Running')
  await setController(page, controller('  ctx.missing("mine")'))
  await expect(page.locator('.squiggly-error').first()).toBeVisible({ timeout: 12_000 })
  await expect(page.locator('.runtime[role=alert]')).toContainText('controller.ts:4')

  await page.locator('.monaco-editor .view-lines').first().click()
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText(
    'import type { Factory } from "inherit"; export function onTick(ctx: Factory) { ctx.',
  )
  await page.keyboard.press('Control+Space')
  await expect(page.locator('.suggest-widget.visible')).toContainText('dig')
  await page.keyboard.press('Escape')

  await setController(page, controller('  throw new Error("Valve closed")'))
  await expect(page.locator('.runtime')).toContainText('controller.ts:4 · Valve closed')
  await expect(page.locator('.squiggly-error').first()).toBeVisible()
  await setController(page, controller('  while (true) {}'))
  await expect(page.locator('.runtime[role=alert]')).toContainText(/interrupted|time budget/i)
  await page.getByRole('button', { name: 'Reset level', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset level' }).click()
  await expect(page.locator('.phase')).toHaveText('Running')
  await page.keyboard.press('Control+]')
  await expect(page.getByRole('button', { name: '2×' })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Control+.')
  await expect(page.locator('.phase')).toHaveText('Paused')
  const tick = page.locator('.metrics dl>div').nth(1).locator('dd')
  const before = Number(await tick.textContent())
  await page.keyboard.press('Control+ArrowRight')
  await expect(tick).toHaveText(String(before + 1).padStart(4, '0'))
})

test('the workshop fits each desktop and the order follows the player into the tab title', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Inspect furnace-a' })).toBeVisible()
  for (const [width, height] of [
    [1440, 900],
    [1920, 1080],
    [1280, 720],
  ] as const) {
    await page.setViewportSize({ width, height })
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollHeight))
      .toBeLessThanOrEqual(height)
    await expect(page.getByRole('button', { name: 'Reset level', exact: true })).toBeInViewport()
  }
  await expect(page).toHaveTitle(/The shed.*inherit/)
})

test('inspect the live command and follow a controller line back to the floor', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.phase')).toHaveText('Running')
  await page.getByRole('button', { name: 'Inspect mine', exact: true }).click()
  const inspector = page.getByRole('region', { name: 'Machine inspector' })
  await expect(inspector).toContainText('dig("mine")')
  await expect(inspector).toContainText('Inventory')
  await expect(page.locator('.machine-line').first()).toBeVisible()
  await page.getByRole('button', { name: 'Close inspector' }).click()
  const reference = page.locator('.view-line').filter({ hasText: 'Machine ID:' })
  await reference.hover()
  await expect(page.getByRole('button', { name: 'Inspect furnace-a' })).toHaveClass(/linked/)
  await reference.click()
  await page.mouse.move(0, 0)
  await expect(page.getByRole('button', { name: 'Inspect furnace-a' })).toHaveClass(/linked/)
})

test.describe('a high-density mobile display', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
  test('the shop plan stacks above the editor and remains inspectable', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('.pixi-mount canvas')
    await expect(canvas).toBeVisible()
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth)).toBe(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    const floor = await canvas.boundingBox()
    const editor = await page.locator('.code-editor').boundingBox()
    expect(floor!.y + floor!.height).toBeLessThan(editor!.y)
    await page.getByRole('button', { name: 'Inspect furnace-a' }).tap()
    await expect(page.getByRole('region', { name: 'Machine inspector' })).toBeVisible()
  })
})
