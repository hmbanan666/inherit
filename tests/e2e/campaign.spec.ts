import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { advanceGame, createCampaign, DAY, TICK_MS, deployGameProject, serializeSave, type Campaign } from '../../packages/sim/src/index'
import { chapterFiles } from '../../packages/sim/src/reference/chapter-one'
import oldWorkshop from './fixtures/v2-workshop.json'

test.use({ viewport: { width: 1600, height: 900 } })

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
test('the workshop grows from Code to Factory after the first dig', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Workshop sections' })
  const factory = nav.getByRole('button', { name: 'Factory', exact: true })
  const card = page.getByRole('region', { name: 'Current request' })
  const editor = page.locator('.project-editor')
  const deploy = page.locator('footer').getByRole('button', { name: 'Deploy', exact: true })
  await expect(deploy).toBeEnabled()
  await expect(editor.locator('.view-lines')).toContainText('The shed is yours')
  await expect(nav.getByRole('button')).toHaveText(['Code'])
  await expect(page.locator('.world-shell, .wallet, .bank-chip, .clock, .speeds')).toHaveCount(0)
  await expect(page.getByRole('tabpanel', { name: 'Checks' })).toBeVisible()
  const box = (await card.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual((await editor.boundingBox())!.y)
  await photo(page, 'first-launch')

  await edit(page, chapterFiles(1, 2)['main.ts']!)
  await expect(card).toContainText('2/7')
  await deploy.click()
  await expect(card).toContainText('3/7')
  await expect(page.locator('.editor-foot')).toContainText('Deployed · your code now runs every tick')
  await page.getByRole('tab', { name: 'Console' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Console' })).toContainText('tick')
  await expect(nav.getByRole('button')).toHaveText(['Code'])
  await photo(page, 'after-step-2')

  await page.getByRole('tab', { name: 'Checks' }).click()
  await edit(page, chapterFiles(1, 3)['main.ts']!)
  await deploy.click()
  await expect(card).toContainText('4/7')
  await expect(factory).toContainText('new')
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await expect(page.locator('.wallet, .bank-chip')).toHaveCount(0)
  await photo(page, 'after-step-3')
  await page.reload()
  await expect(factory).toContainText('new')
  await factory.click()
  await expect(factory).toHaveText('Factory')
  await page.reload()
  await expect(factory).toHaveText('Factory')
  await edit(page, 'export function onTick() {\n  const rock = ;\n}')
  await deploy.click()
  await expect(page.locator('.runtime')).toContainText('Deploy failed · main.ts:2')
  await expect(page.locator('.live')).toHaveText('Live')
})
test('a new player rebuilds Kettlewick with one growing controller', async ({ page }) => {
  // For the beginner pacing pass, leave the previous deployment running during reading and editing.
  const paced = process.env.INHERIT_PLAYTEST_PACE === 'beginner'
  test.setTimeout(paced ? 1_200_000 : 300_000)
  const errors = browserErrors(page)
  const saved = () => page.evaluate((): Campaign => JSON.parse(localStorage.getItem('inherit.workshop.v1')!))
  // While waiting for a shipment, advance the browser clock one ordinary factory tick at a time.
  await page.clock.install()
  const advanceUntil = async (condition: () => Promise<boolean>) => {
    await expect.poll(async () => {
      await page.clock.fastForward(TICK_MS)
      return condition()
    }, { intervals: [10], timeout: 120_000 }).toBe(true)
  }
  const waitForMinute = async (minute: number) => {
    if (paced) await advanceUntil(async () => (await saved()).world.tick >= minute * 240)
  }
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  await page.goto('/')
  const card = page.getByRole('region', { name: 'Current request' })
  await expect(card).toContainText('Horseshoes for the mail horse')
  await expect(card).not.toContainText(/by evening|day \d|late/i)
  await expect(page.locator('.world-shell')).toHaveCount(0)
  await expect(button('Deploy')).toBeEnabled()
  await expect(page.locator('.view-lines')).toBeVisible()
  await photo(page, '01-fresh-shed')
  await waitForMinute(2.5)
  const exactHint = async (step: number) => {
    await expect(card).toContainText(step + '/7')
    await expect(card.locator('code')).toContainText('____')
    await button('Hint').click()
    await expect(button('Show exact step')).toBeVisible()
    await button('Show exact step').click()
    return card.locator('code').allTextContents()
  }
  const [handler] = await exactHint(1)
  await edit(page, handler!)
  await exactHint(2)
  await button('Deploy').click()
  await expect(card).toContainText('3/7')
  const body = ['console.log("tick")']
  let header = ''
  for (const step of [3, 4, 5, 6]) {
    const code = await exactHint(step)
    if (code[0]!.startsWith('import')) header = code.shift()!
    body.push(code[0]!)
    await edit(page, header + '\nexport function onTick() {\n  ' + body.join('\n  ') + '\n}')
    await button('Deploy').click()
  }
  await expect(card).toContainText('7/7')
  await expect(card).toContainText('The family tab', { timeout: 15000 })
  await expect(button('See it')).toBeVisible()
  expect((await saved()).world.tick).toBeLessThan(8 * 240)
  const art = page.getByRole('img', { name: /Bram’s forge/ })
  const visitChange = async (building: string, notice: RegExp, shot: string) => {
    await advanceUntil(async () => notice.test((await page.locator('.town-change').allTextContents()).join(' ')))
    await button('See it').click()
    await expect(page.locator('.town-print canvas')).toBeVisible()
    await expect(art).toHaveAccessibleName(new RegExp(building + ' working'))
    await expect(page.locator('.town-notice').filter({ hasText: notice })).toBeVisible()
    const directory = await page.locator('.town-directory').boundingBox()
    const frame = await page.locator('.map-frame').boundingBox()
    expect(directory!.y + directory!.height).toBeLessThanOrEqual(frame!.y + frame!.height)
    await photo(page, shot)
  }
  const waitForRequest = (title: string) => advanceUntil(async () => (await card.innerText()).includes(title))
  const deployBeat = async (beat: number) => {
    await edit(page, chapterFiles(beat)['main.ts']!)
    await button('Deploy').click()
    await expect(page.locator('.editor-foot')).toContainText('Deployed')
    await expect(page.locator('.runtime')).toHaveCount(0)
  }
  const clue = async (text: RegExp) => {
    await button('Hint').click()
    await expect(card.locator('.request-hint p')).toContainText(text)
    await button('Hint').click()
  }
  const pay = async () => {
    await button('Pay debt').click()
    const payment = page.getByRole('button', { name: /^Pay [0-9]+ coins$/ })
    await advanceUntil(() => payment.isEnabled())
    await payment.click()
  }
  const nav = page.getByRole('navigation', { name: 'Workshop sections' })
  const inbox = nav.getByRole('button', { name: 'Inbox' })
  await expect(nav.getByRole('button', { name: 'Town' })).toContainText('new')
  await expect(nav.getByRole('button', { name: 'Orders' })).toContainText('new')
  await expect(page.locator('.wallet')).toContainText('coins')
  await expect(page.locator('.bank-chip')).toContainText('Debt 600')
  const letter = page.getByRole('status').filter({ hasText: 'New letter from Mrs Harrow' })
  await letter.getByRole('button', { name: 'Open', exact: true }).click()
  const mail = page.getByRole('complementary', { name: 'Inbox' })
  const unread = await mail.getByRole('button', { name: 'Mark read' }).count()
  await expect(inbox).toHaveText('Inbox ' + unread)
  await mail.locator('article').filter({ hasText: 'Uncle' }).last().getByRole('button', { name: 'Mark read' }).click()
  await expect(inbox).toHaveText('Inbox ' + (unread - 1))
  await button('Close drawer').click()
  await visitChange('Bram’s forge', /forge lights up/, '02-forge')
  await expect(page.locator('.town-notice').filter({ hasText: 'bank window' })).toBeVisible()
  await photo(page, '03-bank-tab')
  await page.getByRole('button', { name: /^Bram,/ }).click()
  await page.locator('.town-ribbon .bubble').click()
  await expect(page.locator('.town-voice')).toContainText('Mrs Harrow')
  await clue(/Pay debt/)
  if (paced) await pay()
  else await button('Pay later').click()
  await expect(card).toContainText('A grate for the bread oven')
  await expect(card.locator('.request-work')).toContainText('ctx.work("press", "plate")')
  await clue(/press → cart/)
  await button('Factory').click()
  await waitForMinute(18)
  await deployBeat(3)
  await visitChange('Bakery', /bakery/, '04-bakery')
  await waitForRequest('Light for Lamp Street')
  await clue(/copper-ingot/)
  await button('Factory').click()
  await deployBeat(4)
  if (paced) {
    await waitForMinute(25)
    // Keep the same equipment reserve as the beginner reference before paying the bank early.
    await advanceUntil(async () => (await saved()).economy.money >= 250)
    await pay()
  }
  await waitForMinute(29)
  await deployBeat(5)
  await expect(card).toContainText(/[1-4] \/ 5 coils of wire/, { timeout: 30_000 })
  await photo(page, '05-midgame-wire')
  await button('Settings').click()
  await button('Swap sides').click()
  await button('Settings').click()
  await photo(page, '06-swap-sides')
  await page.reload()
  await expect(page.locator('.desk')).toHaveClass(/swapped/)
  await expect(card).toContainText('Light for Lamp Street')
  await button('Settings').click()
  await button('Swap sides').click()
  await button('Settings').click()
  await visitChange('Lamp Street', /glows/, '07-lamp-street')
  await button('Factory').click()
  await deployBeat(6)
  await waitForRequest('Teeth for the water wheel')
  await clue(/gear/)
  await waitForMinute(40)
  await deployBeat(7)
  await visitChange('Water mill', /wheel turns/, '08-mill')
  await expect(card).toContainText('One press, two regulars')
  await clue(/Elsie/)
  await button('Factory').click()
  await waitForMinute(44)
  await deployBeat(8)
  await waitForRequest('The bridge to Riverside')
  await clue(/assembler/)
  await waitForMinute(56)
  const tree = page.getByRole('region', { name: 'Project files' })
  await tree.getByRole('button', { name: 'New file' }).click()
  await tree.getByLabel('Project path').fill('jobs.ts')
  await button('Create').click()
  await edit(page, chapterFiles(9)['jobs.ts']!)
  await tree.getByRole('button', { name: 'main.ts' }).click()
  await deployBeat(9)
  await visitChange('Riverside bridge', /bridge stands/, '09-bridge')
  await expect(page.locator('.town-notice').filter({ hasText: 'Riverside opens' })).toBeVisible()
  await expect(art).toHaveAccessibleName(/Riverside working/)
  await page.getByRole('button', { name: /^Ines,/ }).click()
  await expect(page.locator('.town-voice')).toContainText('Riverside')
  await expect(page.getByRole('button', { name: /^Pell,/ })).toBeVisible()
  await photo(page, '10-riverside')
  await expect(card).toContainText('The family tab')
  await clue(/remaining installments/)
  await button('Factory').click()
  if (paced) await pay()
  else {
    await button('Pay debt').click()
    const balance = button('Pay balance (600 coins)')
    await advanceUntil(async () => await balance.count() > 0 && await balance.isEnabled())
    await balance.click()
  }
  await expect(card).toContainText('The shed is yours.')
  await visitChange('Kettlewick Bank', /shed is yours/, '11-chapter-end')
  await expect(art).toHaveAccessibleName(/Paid in full/)
  const end = await saved()
  expect(end.town.beat).toBe(11)
  expect(end.town.paid).toBe(600)
  if (paced) {
    console.log(
      'Town change ticks:',
      end.town.changes.map((c) => [c.buildingId, c.tick]),
    )
    expect(end.world.tick).toBeLessThan(60 * 240)
  }
  expect(errors).toEqual([])
})

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
  await expect(page.locator('.view-lines')).toContainText('mine.dig()')
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
  await edit(page, chapterFiles(1)['main.ts']!)
  await page.getByRole('button', { name: 'Deploy', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  expect(attempts).toBe(2)
})
test.describe('a high-density mobile display', () => {
  test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })
  test('panels stack beneath an inspectable floor', async ({ page }) => {
    const c = createCampaign()
    advanceGame(c, ctx => ctx.dig('mine'))
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
      'import { morning, evening } from "./lib/crew"\nexport function onTick(ctx) { if (ctx.tick < 5) (ctx.tick % 2 ? morning : evening)(ctx) }',
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
  await page.locator('.project-editor .view-line').getByText('dig', { exact: true }).last().click()
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
  await page.goto('/')
  await expect(page.locator('.runtime')).toContainText('Could not start the controller worker')
  await edit(page, chapterFiles(1)['main.ts']!)
  await page.getByRole('button', { name: 'Run', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'The family tab' })).toBeVisible({ timeout: 15000 })
  await expect(page.locator('.runtime')).toHaveCount(0)
})
