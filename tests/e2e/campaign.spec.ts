import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import {
  OBJECTIVES,
  RESEARCH,
  createCampaign,
  deployGameProject,
  referenceFiles,
  purchasePlot,
  purchaseMachine,
  research,
  serializeSave,
} from '../../packages/sim/src/index'

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
test('grow one factory from a rock to a second furnace', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dig 1 iron rock' })).toBeVisible()
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await expect(page.locator('.live')).toHaveText('Live')
  const card = page.getByRole('region', { name: 'Objective track' })
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '0 / 1 rocks')
  await expect(page.locator('.station-guide')).toContainText('mine')
  await card.getByRole('button', { name: 'Hint', exact: true }).click()
  await expect(card.locator('code')).toHaveText('ctx.dig("mine")')
  await photo(page, '01-dig-hint-and-machine')
  await card.getByRole('button', { name: 'Hint', exact: true }).click()
  await edit(page, referenceFiles('dig')['main.ts']!)
  await page.keyboard.press('Control+s')
  await expect(page.getByRole('heading', { name: 'Make your first iron ingot' })).toBeVisible()
  await expect(page.getByText('Objective complete', { exact: true })).toBeVisible()
  await photo(page, 'completion')
  await page.getByRole('button', { name: '8×' }).click()
  const deploy = async (stage: string) => {
    await edit(page, referenceFiles(stage)['main.ts']!)
    await page.getByRole('button', { name: 'Deploy', exact: true }).click()
  }
  const goal = (name: string) =>
    expect(page.getByRole('heading', { name, exact: true })).toBeVisible({ timeout: 20000 })
  await deploy('fire')
  await goal('Check a belt for space')
  await deploy('belt-space')
  await goal('Count a dig with a variable')
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await button('Orders').click()
  await expect(page.getByText('Hale Hardware', { exact: true })).toBeVisible()
  await photo(page, 'order-board')
  await page
    .locator('.ticket')
    .filter({ hasText: 'Hale Hardware' })
    .getByRole('button', { name: 'Accept order' })
    .click()
  await button('done').click()
  await expect(page.getByText('Hale Hardware', { exact: true })).toBeVisible({ timeout: 15000 })
  await button('Close drawer').click()
  await deploy('tally')
  await goal('Save a positive count in memory')
  await deploy('chalk')
  await goal('Keep your number through a deploy')
  await deploy('redeploy')
  await goal('Unlock Tape measure')
  await expect(page.getByLabel('Building tutorial')).toBeVisible()
  await photo(page, 'build-tutorial')
  await card.getByRole('button', { name: 'Hint', exact: true }).click()
  await button('Dismiss build tutorial').click()
  await expect(card.locator('.hint-note')).toBeVisible()
  await button('Guide: Research Tape measure').click()
  await expect(button('Research Tape measure')).toHaveClass(/guide-pulse/)
  await photo(page, '02-tape-measure-guide')
  await button('Research Tape measure').click()
  await expect(button('Research Tape measure')).toBeDisabled()
  await button('Close drawer').click()
  await button('Zoom out').click()
  await goal('Buy the east plot')
  await expect(button('Buy east-lot')).toHaveClass(/guide-pulse/)
  await button('Buy east-lot').click()
  await button('Buy plot').click()
  await goal('Place a second furnace')
  await button('Center map').click()
  const palette = page.getByRole('toolbar', { name: 'Build palette' })
  const burner = palette.getByRole('button', { name: 'Build Furnace' })
  await expect(card.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '1 / 2 furnaces')
  await expect(burner).toHaveClass(/guide-pulse/)
  await photo(page, '03-furnace-progress-and-shop')
  await burner.hover()
  await page.mouse.down()
  const start = await burner.boundingBox()
  await page.mouse.move(start!.x + 15, start!.y - 8, { steps: 4 })
  const destination = button('Place Furnace at shed 4, 3')
  await expect(destination).toHaveClass(/target-cell/)
  await expect(button('Place Furnace at shed 4, 2')).toBeDisabled()
  const target = await destination.boundingBox()
  await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 })
  await expect(page.locator('.tile-preview.valid')).toContainText('24 coins')
  await photo(page, 'build-placement')
  await page.mouse.up()
  await goal('Connect both furnaces to the dock')
  const output = button('furnace-b output')
  await button('Belt tool').click()
  await button('Inspect furnace-b').click()
  await button('Inspect dock').hover()
  await expect(page.locator('.wire-preview')).toBeVisible()
  await expect(page.locator('.tile-preview.valid')).toContainText('coins')
  await photo(page, 'belt-route')
  await button('Inspect dock').click()
  await goal('Unlock Bin gauges')
  await button('Inspect furnace-a').click()
  await expect(page.getByRole('region', { name: 'Machine inspector' })).toContainText('main.ts:')
  await photo(page, 'mid-game')
  await button('Close inspector').click()
  await button('Zoom out').click()
  await button('Zoom out').click()
  await photo(page, 'map')
  await page.reload()
  await goal('Unlock Bin gauges')
  await expect(output).toBeVisible()
  await expect(page.getByLabel('Building tutorial')).toHaveCount(0)
  await expect(page.locator('.view-lines')).toContainText('memory.rocks')
})

test('a controller fault leaves the world ticking and a previous revision can resume digging', async ({
  page,
}) => {
  await page.goto('/')
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await expect(button('Deploy')).toBeEnabled()
  await edit(page, referenceFiles('dig')['main.ts']!)
  await button('Deploy').click()
  await expect(page.getByRole('heading', { name: 'Make your first iron ingot' })).toBeVisible()
  await edit(page, 'export function onTick() {\n  throw new Error("Valve closed")\n}')
  await page.keyboard.press('Control+Enter')
  await expect(page.locator('.runtime')).toContainText('main.ts:2 · Valve closed')
  const before = await page.locator('.tick b').textContent()
  await expect(page.locator('.tick b')).not.toHaveText(before!)
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
  await expect(page.getByRole('heading', { name: 'Make your first iron ingot' })).toBeVisible()
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
  await expect(page.locator('.view-lines')).toContainText('inherited draft')
  await page.getByRole('button', { name: 'Deploy', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Make your first iron ingot' })).toBeVisible()
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
    await page.getByRole('button', { name: 'Inspect furnace-a' }).tap()
    await expect(page.getByRole('region', { name: 'Machine inspector' })).toBeVisible()
  })
})

test('a machine remembers the actual helper lines that commanded it', async ({ page }) => {
  const campaign = createCampaign()
  campaign.economy.researchPoints = 12
  for (const id of ['bins', 'fork', 'binder']) research(campaign, id)
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

test('click placement, drag wiring and refunds work while the factory is paused', async ({ page }) => {
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await page.goto('/')
  await expect(page.locator('.live')).toHaveText('Live')
  await button('Pause').click()
  await page.keyboard.press('b')
  await expect(button('Build mode')).toHaveAttribute('aria-pressed', 'true')
  await button('Dismiss build tutorial').click()
  await button('Place Furnace at shed 4, 3').click()
  await expect(button('Inspect furnace-b')).toBeVisible()
  await expect(page.locator('.wallet b')).toHaveText('76')
  await button('furnace-b output').dragTo(button('dock input'))
  await expect(page.locator('.wallet b')).toHaveText('66')
  await button('Remove tool').click()
  await button('Inspect furnace-b').click()
  await button('furnace-b → dock').click()
  await button('Sell · +10 coins').click()
  await expect(page.locator('.wallet b')).toHaveText('76')
  await button('Inspect furnace-b').click()
  await button('Sell · +24 coins').click()
  await expect(button('Inspect furnace-b')).toHaveCount(0)
  await expect(page.locator('.wallet b')).toHaveText('100')
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
  await edit(page, referenceFiles('dig')['main.ts']!)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Make your first iron ingot' })).toBeVisible()
  await expect(page.locator('.runtime')).toHaveCount(0)
})

test('a road permit opens the freight yard for construction', async ({ page }) => {
  const c = createCampaign()
  c.economy.researchPoints = 100
  c.economy.money = 350
  for (const node of RESEARCH) research(c, node.id)
  c.progress.completedObjectives = OBJECTIVES.slice(
    0,
    OBJECTIVES.findIndex((o) => o.id === 'road'),
  ).map((o) => o.id)
  await page.addInitScript((save) => localStorage.setItem('inherit.workshop.v1', save), serializeSave(c))
  await page.goto('/')
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await button('Guide: Open road shop').click()
  await button('Buy yard road · 90 coins').click()
  await button('Close drawer').click()
  await button('Yard').click()
  await expect(page.locator('.map-location')).toContainText('Freight yard')
  await page
    .getByRole('toolbar', { name: 'Build palette' })
    .getByRole('button', { name: 'Build Road depot' })
    .click()
  await button('Place Road depot at yard 1, 1').click()
  await expect(button('Inspect remote')).toBeVisible()
  await button('Zoom out').click()
  await button('Zoom out').click()
  await button('Zoom out').click()
  await photo(page, 'yard-road')
})

test('the Blueprint hints build on the marked tile and wire the player’s own machines', async ({ page }) => {
  const c = createCampaign()
  c.progress.completedObjectives = ['copper']
  c.economy.researchPoints = 30
  c.economy.money = 350
  for (const id of ['survey', 'bins', 'fork', 'binder', 'copper']) research(c, id)
  expect(purchasePlot(c, 'shed', 'east-lot')).toBe(true)
  expect(purchaseMachine(c, 'miner', 'shed', 9, 2, 'green seam')).toBeTruthy()
  await page.addInitScript((save) => localStorage.setItem('inherit.workshop.v1', save), serializeSave(c))
  await page.goto('/')
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await button('Guide: Research Blueprint API').click()
  await expect(button('Research Blueprint API')).toHaveClass(/guide-pulse/)
  await button('Research Blueprint API').click()
  await button('Close drawer').click()
  const tutorial = button('Dismiss build tutorial')
  if (await tutorial.isVisible()) await tutorial.click()
  await button('Guide: Find tile (10, 2)').click()
  await expect(page.getByRole('img', { name: 'Guide tile at shed 10, 2' })).toBeInViewport()
  const card = page.getByRole('region', { name: 'Objective track' })
  const pasteHint = async () => {
    const code = await card.locator('code').innerText()
    await edit(
      page,
      'import type { Factory } from "inherit"\nexport function onTick(ctx: Factory) {\n' + code + '\n}',
    )
    await button('Deploy').click()
  }
  await button('Hint').click()
  await expect(card.locator('code')).toContainText('ctx.build("furnace", 10, 2')
  await photo(page, '04-blueprint-hint-and-tile')
  await pasteHint()
  await expect(card.getByRole('heading')).toHaveText('Connect your new furnace from code')
  await expect(page.locator('.station-guide')).toContainText('furnace-1')
  await button('Hint').click()
  await expect(card.locator('code')).toContainText('ctx.connect("green seam", memory.oven)')
  await pasteHint()
  await expect(card.getByRole('heading')).toHaveText('Dig 1 copper rock')
  await expect(page.locator('.station-guide')).toContainText('green seam')
})
