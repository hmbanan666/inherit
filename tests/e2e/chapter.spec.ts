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
  await page.getByRole('button', { name: 'Run', exact: true }).click()
}
async function wire(page: Page, from: string, to: string) {
  await page
    .getByRole('button', { name: from + ' output', exact: true })
    .dragTo(page.getByRole('button', { name: to + ' input', exact: true }))
}
async function photo(page: Page, n: number) {
  await expect.poll(async () => Number(await page.locator('.rate strong').textContent())).toBeGreaterThan(0)
  await page.locator('.floor-label').click({ force: true })
  if (process.env.INHERIT_SHOTS) {
    await mkdir(process.env.INHERIT_SHOTS, { recursive: true })
    await page.screenshot({ path: join(process.env.INHERIT_SHOTS, 'level-' + n + '.png') })
  }
}
test('write, build and ship the shed chapter', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
  })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'The shed', exact: true })).toBeVisible()
  await expect(page.locator('.phase')).toHaveText('Running')
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await page.getByRole('button', { name: '4×' }).click()
  await setController(page, ['ctx.dig("mine")', 'ctx.work("furnace-a")'])
  await photo(page, 1)
  await expect(page.getByText('Order shipped', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Next level' }).click()
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
  await page.getByRole('button', { name: 'Next level' }).click({ timeout: 20_000 })
  await page.getByRole('button', { name: 'Coal mine', exact: true }).click()
  const stage = (await page.locator('.floor-stage').boundingBox())!
  await page.mouse.click(stage.x + (stage.width * 140) / 760, stage.y + (stage.height * 246) / 324)
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
  await page.getByRole('button', { name: 'Next level' }).click({ timeout: 20_000 })
  await expect(page.getByRole('heading', { name: 'Loading bay' })).toBeVisible()
  await setController(page, ['if (ctx.space("mine")) ctx.dig("mine")', 'ctx.work("furnace-a")'])
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

  await setController(page, ['while (true) {}'])
  await expect(page.locator('.runtime[role=alert]')).toContainText(/interrupted|time budget/i)
  await page.getByRole('button', { name: 'Reset level', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Reset level' }).click()
  await expect(page.locator('.phase')).toHaveText('Running')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('.phase')).toHaveText('Paused')
  const tick = page.locator('.metrics dl>div').nth(1).locator('dd')
  const before = Number(await tick.textContent())
  await page.getByRole('button', { name: 'Step', exact: true }).click()
  await expect(tick).toHaveText(String(before + 1).padStart(4, '0'))
})
