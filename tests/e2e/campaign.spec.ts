import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { advanceGame, createCampaign, DAY, lessons, deployGameProject, serializeSave, type Campaign } from '../../packages/sim/src/index'
import { chapterFiles } from '../chapter-controllers'
import oldWorkshop from './fixtures/v2-workshop.json'

test.use({ viewport: { width: 1440, height: 900 } })

function browserErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  return errors
}

async function photo(page: Page, name: string) {
  const dir = process.env.INHERIT_SHOTS
  if (!dir) return
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: join(dir, name + '.png') })
}
async function edit(page: Page, text: string) {
  await page.getByRole('textbox', { name: 'Factory controller TypeScript' }).focus()
  await page.keyboard.press('Control+a')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((value) => navigator.clipboard.writeText(value), text)
  await page.keyboard.press('Control+v')
  await expect(page.locator('.editor-foot')).toContainText('Working copy')
}
async function typeHint(page: Page) {
  const card = page.getByRole('region', { name:'Current request' })
  await card.getByRole('button', {name:'Hint',exact:true}).click()
  await card.getByRole('button', {name:'Show exact step'}).click()
  const source = (await card.locator('code.exact').textContent())!
  await card.getByRole('button', {name:'Hide hint'}).click()
  await page.getByRole('textbox', {name:'Factory controller TypeScript'}).focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText(source)
}
test('type the growing library from the hints and rebuild Riverside', async ({page}) => {
  test.setTimeout(240000)
  const errors = browserErrors(page)
  const nav = page.getByRole('navigation', {name:'Workshop sections'})
  const card = page.getByRole('region',{name:'Current request'})
  const checks = page.getByRole('tabpanel',{name:'Checks'})
  await page.goto('/')
  await expect(page.locator('.view-lines')).toContainText('export function dig')
  await expect(nav.getByRole('button')).toHaveText(['Code'])
  await expect(page.locator('.world-shell, .wallet, .bank-chip, .speeds')).toHaveCount(0)
  await expect(page.getByRole('button',{name:'Deploy',exact:true})).toBeEnabled()
  await expect(page.locator('.view-line').getByText('export',{exact:true})).toHaveCSS('color','rgb(222, 169, 237)')
  await photo(page,'first-launch')
  for (const task of lessons) {
    await expect(card).toContainText(task.title,{timeout:30000})
    await expect(page.locator('.file-tabs')).toContainText(task.file)
    if (task.id === 'smelt') {
      await expect(page.locator('.my-library')).not.toHaveAttribute('open','')
      await photo(page,'smelt-kata')
    }
    await typeHint(page)
    if (task.cases.length) {
      await expect(checks.locator('.done-count')).toContainText(task.cases.length + ' done')
      if (task.id === 'dig') {
        await checks.locator('.done-count').click()
        await expect(checks.locator('[data-state="done"]')).toBeVisible()
        await photo(page,'dig-green')
      }
      continue
    }
    await page.keyboard.press('Control+Enter')
    if (task.beat === 1) {
      await expect(nav.getByRole('button',{name:'Factory'})).toContainText('new')
      await expect(page.locator('.pixi-mount canvas')).toBeVisible()
      await photo(page,'wire-up-deploy')
      await expect(card).toContainText('The family tab',{timeout:15000})
      await expect(nav.getByRole('button',{name:'Town'})).toContainText('new')
      await expect(nav.getByRole('button',{name:'Inbox'})).toBeVisible()
      await expect(nav.getByRole('button',{name:'Orders'})).toBeVisible()
      await expect(page.locator('.wallet')).toContainText('coins')
      await page.getByRole('button',{name:'See it'}).click()
      await expect(page.getByRole('img',{name:/Bram’s forge working/})).toBeVisible()
      await nav.getByRole('button',{name:'Factory'}).click()
      await page.getByRole('button',{name:'Pay later'}).click()
    }
  }
  await expect(card).toContainText('The family tab',{timeout:30000})
  await page.getByRole('button',{name:'Pay debt'}).click()
  await page.getByRole('button',{name:'Pay balance (600 coins)'}).click()
  await expect(card).toContainText('The shed is yours.')
  expect(errors).toEqual([])
})

async function seedWireUp(page: Page) {
  const c = createCampaign()
  c.town.solved = ['dig','smelt','ship']
  c.project.working = chapterFiles(1,'ship')
  await page.addInitScript(save => {
    if (!localStorage.getItem('inherit.workshop.v1')) localStorage.setItem('inherit.workshop.v1',save)
  },serializeSave(c))
}
test('the town clock changes the light without printing a day or phase', async ({ page }) => {
  const campaign = createCampaign()
  campaign.town.changes.push({ buildingId: 'forge', text: 'The forge lights up.', tick: 10 })
  campaign.progress.messages.push({ ...campaign.progress.messages[0]!, id: 'tab', from: 'Mrs Harrow' })
  campaign.world.tick = 2 * DAY
  campaign.town.beat = 3
  await page.addInitScript((save) => localStorage.setItem('inherit.workshop.v1', save), serializeSave(campaign))
  await page.goto('/')
  const calendar = /\b(day|morning|evening|night)\b/i
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await expect(page.getByRole('heading', { name: 'A grate for the bread oven' })).toBeVisible()
  await expect(page.locator('.map-frame')).toHaveAttribute('data-phase', 'morning')
  await expect(page.locator('.world-shell')).not.toContainText(calendar)

  await button('Pay debt').click()
  await expect(button('Pay 100 coins')).toBeVisible()
  await expect(page.locator('.hud')).not.toContainText(calendar)
  await button('Pay debt').click()

  for (const drawer of ['Inbox', 'Orders']) {
    await button(drawer).click()
    const panel = page.getByRole('complementary', { name: drawer })
    await expect(panel.locator('article').first()).toBeVisible()
    await expect(panel).not.toContainText(calendar)
    await button('Close drawer').click()
  }
  await button('Town').click()
  const town = page.getByRole('region', { name: 'Kettlewick' })
  await expect(town.getByRole('img', { name: /Bram’s forge/ })).toBeVisible()
  await expect(town.locator('header')).toHaveText('Kettlewick')
  await expect(town).not.toContainText(calendar)
})

test('a saved v2 workshop starts with Bram and keeps the original controller files', async ({ page }) => {
  const errors = browserErrors(page)
  // Serialized with the pre-town createCampaign and deployProject at 6382dd0.
  await page.addInitScript((save) => {
    if (!localStorage.getItem('inherit.workshop.v1')) localStorage.setItem('inherit.workshop.v1', save)
  }, JSON.stringify(oldWorkshop))
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled()
  await expect(page.getByRole('heading', { name: 'Horseshoes for the mail horse' })).toBeVisible()
  await expect(page.locator('.world-shell')).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Deploy history' }).click()
  await page.getByRole('button', { name: 'Open v2 code' }).click()
  await expect(page.locator('.view-lines')).toContainText('from "./feed"')
  const archive = await page.evaluate(
    (): Campaign => JSON.parse(localStorage.getItem('inherit.workshop.v1')!),
  )
  expect(archive.project.working).toEqual(oldWorkshop.project.working)
  expect(archive.project.deployed).not.toEqual(oldWorkshop.project.deployed)
  await expect(page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled()
  expect(errors).toEqual([])
})
test('a controller fault leaves the world ticking and a previous revision can resume digging', async ({
  page,
}) => {
  await seedWireUp(page)
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
  await expect(page.locator('.view-lines')).toContainText('smelt()')
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
  await expect.poll(() => navigations, { timeout: 20000 }).toBe(2)
  await expect(page.getByRole('button', { name: 'Deploy', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: 'Deploy history' }).click()
  await page.getByRole('button', { name: 'Open v2 code' }).click()
  await expect(page.locator('.view-lines')).toContainText('inherited draft')
  expect(attempts).toBe(2)
})
test.describe('a high-density mobile display', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
  test('panels stack beneath an inspectable floor', async ({ page }) => {
    const c = createCampaign()
    advanceGame(c, ctx => ctx.take('mine'))
    await page.addInitScript(save => localStorage.setItem('inherit.workshop.v1', save), serializeSave(c))
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
  campaign.town.changes.push({ buildingId: 'forge', text: 'The forge lights up.', tick: 0 })
  campaign.project.working = {
    'main.ts':
      'import { morning, evening } from "./lib/crew"\nlet tick = 0; export function onTick() { if (++tick < 5) (tick % 2 ? morning : evening)() }',
    'lib/crew.ts':
      'import {take} from "inherit"; export function morning() {\n  take("mine")\n}\nexport function evening() {\n  take("mine")\n}',
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
  // Sample the mine's canvas pixels without the inspector or Monaco selection overlay.
  const mine = page.getByRole('button', { name: 'Inspect mine', exact: true })
  const floor = page.locator('.pixi-mount canvas')
  const pixels = async () =>
    floor.evaluate(
      (canvas: HTMLCanvasElement, hit) => {
        const r = canvas.getBoundingClientRect()
        const patch = document.createElement('canvas')
        patch.width = 132
        patch.height = 86
        const scale = canvas.width / r.width
        patch
          .getContext('2d')!
          .drawImage(
            canvas,
            (hit.x + hit.width / 2 - r.left - 66) * scale,
            (hit.y + hit.height / 2 - r.top - 43) * scale,
            132 * scale,
            86 * scale,
            0,
            0,
            132,
            86,
          )
        return patch.toDataURL()
      },
      (await mine.boundingBox())!,
    )
  await page.getByRole('button', { name: 'Close inspector' }).click()
  // Let this short controller finish its digs before comparing the pulse with an idle mine.
  await expect.poll(() => page.evaluate(() =>
    JSON.parse(localStorage.getItem('inherit.workshop.v1')!).world.tick as number,
  )).toBeGreaterThan(5)
  await page.getByRole('button', { name: 'Town', exact: true }).click()
  await page.getByRole('button', { name: 'Factory', exact: true }).click()
  await expect(floor).toBeVisible()
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
  const rest = await pixels()
  const pulses = async () => {
    await expect.poll(async () => (await pixels()) !== rest, { intervals: [20] }).toBe(true)
    await expect.poll(async () => (await pixels()) === rest).toBe(true)
  }
  await mine.click()
  await pulses()
  await page.getByRole('button', { name: 'Close inspector' }).click()
  await page.getByRole('button', { name: 'Town', exact: true }).click()
  await page.locator('.project-editor .view-line').getByText('take', { exact: true }).last().click()
  await expect(floor).toBeVisible()
  await pulses()
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
  await seedWireUp(page)
  await page.goto('/')
  await expect(page.locator('.runtime')).toContainText('Could not start the controller worker')
  await edit(page, chapterFiles(1)['main.ts']!)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.runtime')).toHaveCount(0)
})
