import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  advanceGame,
  createCampaign,
  deployGameProject,
  payInstallment,
  serializeSave,
  townSnapshot,
} from '../../packages/sim/src/index'
import { chapterFiles } from '../../packages/sim/src/reference/chapter-one'
import { createProgram } from '../../packages/sandbox/src/index'

async function photo(page: Page, name: string) {
  const dir = process.env.INHERIT_SHOTS
  if (!dir) return
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: join(dir, name + '.png') })
}
async function edit(page: Page, text: string) {
  await page.locator('.monaco-editor .view-lines').first().click()
  await page.keyboard.press('Control+a')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((value) => navigator.clipboard.writeText(value), text)
  await page.keyboard.press('Control+v')
  await expect(page.locator('.editor-foot')).toContainText('Working copy')
}
test('a new player shoes the mail horse in code and sees the forge working', async ({ page }) => {
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Current request' })
  await expect(card).toContainText('Horseshoes for the mail horse')
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await expect(page.locator('.live')).toHaveText('Live')
  await expect(page.locator('.view-lines')).toBeVisible()
  await photo(page, '01-fresh-shed')
  await button('Hint').click()
  await expect(card.locator('code')).toHaveText('ctx.dig("mine")')
  const lines: string[] = []
  for (const [line, next] of [
    ['ctx.dig("mine")', 'Add the mine’s belt'],
    ['ctx.connect("mine", "furnace")', 'Tell the furnace to smelt'],
    ['ctx.work("furnace")', 'Connect the furnace to the cart'],
    ['ctx.connect("furnace", "cart")', 'Leave the controller running'],
  ] as const) {
    lines.push(line)
    await edit(
      page,
      'import type { Factory } from "inherit"\nexport function onTick(ctx: Factory) {\n  ' +
        lines.join('\n  ') +
        '\n}',
    )
    await button('Deploy').click()
    await expect(card).toContainText(next)
  }
  await expect(card).toContainText('The family tab', { timeout: 15000 })
  await expect(button('See it')).toBeVisible()
  await photo(page, '02-mail-horse')
  await button('See it').click()
  await expect(
    page
      .getByRole('region', { name: 'Kettlewick buildings' })
      .locator('.ticket')
      .filter({ hasText: 'Bram’s forge' }),
  ).toContainText('working')
  await button('Pay debt').click()
  await button('Pay 100 coins').click()
  await expect(card).toContainText('A grate for the bread oven')
  await button('Factory').click()
  await edit(page, chapterFiles(3)['main.ts']!)
  await button('Deploy').click()
  await expect(page.locator('.toast')).toContainText('A mixed vein', { timeout: 15000 })
  await photo(page, '03-mixed-vein')
  await expect(card).toContainText('Light for Lamp Street')
  await button('Dismiss celebration').click()
  await edit(page, chapterFiles(5)['main.ts']!)
  await button('Deploy').click()
  await expect(card).toContainText(/[1-4] \/ 5 coils of wire/, { timeout: 15000 })
  await button('Pause').click()
  await photo(page, '04-lamp-street-request')
  await button('Settings').click()
  await button('Swap sides').click()
  await page.reload()
  await expect(page.locator('.desk')).toHaveClass(/swapped/)
  await expect(card).toContainText('Light for Lamp Street')
})

test('the final payment opens free play and the Riverside letter', async ({ page }) => {
  const c = createCampaign()
  // Reach the bank with real shipments and saved controller revisions.
  while (c.town.beat < 10) {
    const beat = c.town.beat
    c.project.working = chapterFiles(beat === 2 ? 1 : beat)
    deployGameProject(c)
    const program = await createProgram({ files: c.project.deployed, memory: c.memory, budget: 1024 })
    try {
      while (c.town.beat === beat && c.world.tick < 14400) {
        advanceGame(c, program)
        if (beat === 2) payInstallment(c)
      }
    } finally {
      program.dispose()
    }
    expect(c.world.tick).toBeLessThan(14400)
  }
  const program = await createProgram({ files: c.project.deployed, memory: c.memory, budget: 1024 })
  try {
    while (c.world.tick < 14400) {
      const next = townSnapshot(c).debt.next!
      if (c.economy.money >= next.amount) {
        if (c.town.payments === 2) break
        payInstallment(c)
      }
      advanceGame(c, program)
    }
  } finally {
    program.dispose()
  }
  expect(c.world.tick).toBeLessThan(14400)
  await page.addInitScript((save) => localStorage.setItem('inherit.workshop.v1', save), serializeSave(c))
  await page.goto('/')
  await expect(page.locator('.live')).toHaveText('Live')
  await page.getByRole('button', { name: 'Pay debt' }).click()
  await page.getByRole('button', { name: /Pay [0-9]+ coins/ }).click()
  await expect(page.getByRole('heading', { name: 'The shed is yours.' })).toBeVisible()
  await page.getByRole('button', { name: 'See it' }).click()
  await expect(page.getByText(/Ines · happy/)).toBeVisible()
  await photo(page, '05-chapter-end')
})
test('a controller fault leaves the world ticking and a previous revision can resume digging', async ({
  page,
}) => {
  await page.goto('/')
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await expect(button('Deploy')).toBeEnabled()
  await edit(page, chapterFiles(1)['main.ts']!)
  await button('Deploy').click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  await edit(page, 'export function onTick() {\n  throw new Error("Valve closed")\n}')
  await page.keyboard.press('Control+Enter')
  await expect(page.locator('.runtime')).toContainText('main.ts:2 · Valve closed')
  await expect(page.locator('.live')).toHaveText('Offline')
  await expect(button('Run')).toBeVisible()
  await button('Deploy history').click()
  await page.getByRole('button', { name: /Restore #1 / }).click()
  await expect(page.locator('.runtime')).toHaveCount(0)
  await expect(page.locator('.view-lines')).toContainText('ctx.dig("mine")')
  await button('Pause').click()
  await expect(button('Resume')).toBeVisible()
  await button('Settings').click()
  await button('New game').click()
  await button('Keep playing').click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
})

test('a missing worker refreshes once and preserves the notebook draft', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('inherit.workshop.v1')) return
    localStorage.setItem(
      'inherit.workshop.v1',
      JSON.stringify({
        current: 0,
        entries: { 0: { code: 'export function onTick(ctx) { ctx.dig("mine") } // inherited draft' } },
      }),
    )
  })
  let attempts = 0,
    navigations = 0
  await page.route('/', async (route) => {
    if (route.request().isNavigationRequest()) navigations++
    await route.continue()
  })
  await page.route('**/_nuxt/builds/latest.json*', (route) =>
    route.fulfill({ json: { id: 'new-factory-build' } }),
  )
  await page.route('**/_nuxt/runner.worker-*.js', (route) =>
    ++attempts === 1
      ? route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' })
      : route.continue(),
  )
  await page.goto('/')
  await expect(page.locator('.live')).toHaveText('Live', { timeout: 20000 })
  expect(navigations).toBe(2)
  await page.getByRole('button', { name: 'Deploy history' }).click()
  await page.getByRole('button', { name: 'Open v2 code' }).click()
  await expect(page.locator('.view-lines')).toContainText('inherited draft')
  await edit(page, chapterFiles(1)['main.ts']!)
  await page.getByRole('button', { name: 'Deploy', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  expect(attempts).toBe(2)
})
test.describe('a high-density mobile display', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
  test('panels stack beneath an inspectable floor', async ({ page }) => {
    await page.goto('/')
    const canvas = page.locator('.pixi-mount canvas')
    await expect(canvas).toBeVisible()
    await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.width / c.clientWidth)).toBe(2)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
    await page.getByRole('button', { name: 'Inspect furnace' }).tap()
    await expect(page.getByRole('region', { name: 'Machine inspector' })).toBeVisible()
  })
})

test('a machine remembers the actual helper lines that commanded it', async ({ page }) => {
  const campaign = createCampaign()
  campaign.town.beat = 9
  campaign.project.working = {
    'main.ts':
      'import { morning, evening } from "./lib/crew"\nexport function onTick(ctx) { (ctx.tick % 2 ? morning : evening)(ctx) }',
    'lib/crew.ts':
      'export function morning(ctx) {\n  ctx.dig("mine")\n}\nexport function evening(ctx) {\n  ctx.dig("mine")\n}',
  }
  deployGameProject(campaign)
  await page.addInitScript(
    (save) => localStorage.setItem('inherit.workshop.v1', save),
    serializeSave(campaign),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Inspect mine', exact: true }).click()
  const inspector = page.getByRole('region', { name: 'Machine inspector' })
  await expect(inspector).toContainText('morning · lib/crew.ts:2')
  await expect(inspector).toContainText('evening · lib/crew.ts:5')
  await page.getByRole('button', { name: 'evening · lib/crew.ts:5' }).click()
  await expect(page.locator('.view-lines')).toContainText('function evening')
  await expect(page.locator('.runtime')).toHaveCount(0)
})

test('Run retries an unavailable worker without refreshing the same page', async ({ page }) => {
  let failed = false
  await page.route('**/_nuxt/builds/latest.json*', (route) => route.fulfill({ status: 503, body: '' }))
  await page.route('**/_nuxt/runner.worker-*.js', (route) => {
    if (failed) return route.continue()
    failed = true
    return route.abort()
  })
  await page.goto('/')
  await expect(page.locator('.runtime')).toContainText('Could not start the controller worker')
  await edit(page, chapterFiles(1)['main.ts']!)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.runtime')).toHaveCount(0)
})
