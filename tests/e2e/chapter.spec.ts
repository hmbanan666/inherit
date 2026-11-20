import { expect, test, type Page } from '@playwright/test'
import { join } from 'node:path'
import { mkdir } from 'node:fs/promises'

async function setController(page: Page, lines: string[]) {
  await page.locator('.monaco-editor .view-lines').first().click()
  await page.keyboard.press('Control+a')
  const source = [
    'import type { Factory } from "inherit"',
    '',
    'export function onTick(ctx: Factory) {',
    ...lines.map((line) => '  ' + line),
    '}',
  ].join('\n')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((text) => navigator.clipboard.writeText(text), source)
  await page.keyboard.press('Control+v')
  await page.getByRole('button', { name: /^(Run|Retry|Restart)$/ }).click()
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
  await setController(page, ['ctx.dig("mine")', 'ctx.work("furnace-a")'])
  await photo(page, 1)
  await expect(page.getByText('Order shipped', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('.order-stamp')).toHaveText('SHIPPED')
  await expect(page.locator('.shipped small')).toHaveText(/\d+ ticks · \d+\/min · 5 lines of code/)
  if (process.env.INHERIT_SHOTS) {
    await page.screenshot({ path: join(process.env.INHERIT_SHOTS, 'completion.png') })
  }
  await page.getByRole('button', { name: 'Next order' }).click()
  await expect(page.getByRole('heading', { name: 'Second furnace' })).toBeVisible()
  await wire(page, 'splitter', 'furnace-b')
  await setController(page, [
    'ctx.dig("mine")',
    'const target = ctx.tick % 2 ? "furnace-a" : "furnace-b"',
    'ctx.route("splitter", target)',
    'ctx.work("furnace-a")',
    'ctx.work("furnace-b")',
  ])
  await photo(page, 2)
  await page.getByRole('button', { name: 'Next order' }).click({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Coal mine', exact: true }).click()
  await page.getByRole('button', { name: 'Place at 2, 4' }).click()
  await wire(page, 'coal-mine', 'press')
  await setController(page, [
    'ctx.dig("mine")',
    'ctx.work("furnace-a")',
    'ctx.dig("coal-mine")',
    'ctx.work("press")',
  ])
  await photo(page, 3)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Parts department' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Inspect coal-mine' })).toBeVisible()
  await page.getByRole('button', { name: '4×' }).click()
  await page.getByRole('button', { name: 'Next order' }).click({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Loading bay' })).toBeVisible()
  await setController(page, ['if (ctx.space("mine")) ctx.dig("mine")', 'ctx.work("furnace-a")'])
  await photo(page, 4)
  await expect(page.getByText('Order shipped', { exact: true })).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
})

test('editor checks factory types, suggests commands and recovers from a stopped handler', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.phase')).toHaveText('Running')
  await setController(page, ['ctx.missing("mine")'])
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

  await setController(page, ['throw new Error("Valve closed")'])
  await expect(page.locator('.runtime')).toContainText('controller.ts:4 · Valve closed')
  await expect(page.locator('.squiggly-error').first()).toBeVisible()
  await setController(page, ['while (true) {}'])
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
