import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import type { FactorySave } from '../../apps/web/app/lib/factoryProtocol'

const saveKey = 'inherit.v8.kettlewick'
function saved(page: Page): Promise<FactorySave> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)!), saveKey)
}
async function edit(page: Page, source: string) {
  await page.getByRole('textbox', { name: 'Player TypeScript' }).focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText(source)
}
async function settings(page: Page, name: string) {
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name, exact: true }).click({ timeout: 5000 })
}

test('Bram asks, the cart sticks, and deploying the one-line fix pays him', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Horseshoes for the mail horse' })).toBeVisible()
  await expect(page.getByTestId('ask')).toContainText('I need 4 ingots for horseshoes')
  await expect(page.getByLabel('Current request')).not.toContainText('Due in')
  await expect(page.getByText('Running', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inherit showcase' })).toBeVisible()
  await expect(page.getByLabel('Factory map').locator('canvas')).toBeVisible()
  await expect(page.getByLabel('Village').locator('canvas')).toBeVisible()
  await expect(page.getByLabel('Project files').getByRole('button', { name: 'main.ts' })).toBeVisible()
  await expect(page.locator('.view-lines')).toContainText('const home = false')
  await expect(page.getByRole('button', { name: /^(Deploy|Pause|Resume|[124]x|Start over)$/ })).toHaveCount(0)
  await expect(page.getByLabel('Factory metrics')).toBeHidden()
  await expect(page.getByLabel('Console', { exact: true })).toBeHidden()
  await expect(page.getByLabel('API reference')).toBeHidden()
  const request = page.getByLabel('Current request')
  await expect(request).toContainText('never comes back', { timeout: 15_000 })
  await expect(page.getByTestId('credits')).toHaveText('Credits 300 · 0.0 cr/min')
  const stuck = request.locator('.next')
  const stuckText = await stuck.innerText()
  await page.waitForTimeout(1200)
  await expect(stuck).toHaveText(stuckText)
  if (process.env.INHERIT_SHOTS) await page.screenshot({ path: join(process.env.INHERIT_SHOTS, 'kettlewick-before.png') })
  const dock = page.locator('.editor-dock')
  const width = (await dock.boundingBox())!.width
  await page.getByRole('separator', { name: 'Resize editor' }).press('ArrowLeft')
  expect((await dock.boundingBox())!.width).toBeGreaterThan(width)
  await settings(page, 'Charts')
  await expect(page.getByLabel('Factory metrics')).toBeVisible()
  await settings(page, 'API')
  await expect(page.getByLabel('API reference')).toContainText('furnace.smelt()')
  await settings(page, 'Console')
  await expect(page.getByTestId('tick')).toBeVisible()
  await expect(page.getByLabel('Factory metrics')).toBeHidden()
  await edit(page, `import { drones, veins, furnace, orders, ship, findPath } from "inherit"
export function onTick() {
  const drone = drones()[0]
  const vein = veins()[0]
  const home = drone.cargo >= drone.capacity
  const target = home ? furnace : vein
  if (!drone.isNear(target)) drone.moveAlong(findPath(drone.pos, target.pos))
  else if (home) drone.unload(furnace)
  else drone.mine(vein)
  if (furnace.input >= 2) furnace.smelt()
  for (const order of orders()) ship(order)
}`)
  await page.keyboard.press('Control+Enter')
  await expect(page.getByRole('button', { name: 'Deploy' })).toBeHidden()
  await expect(page.getByTestId('credits')).toContainText('380', { timeout: 45_000 })
  await expect(page.getByRole('heading', { name: 'Metal for the bridge' })).toBeVisible()
  await expect(page.getByTestId('ask')).toContainText('footbridge')
  if (process.env.INHERIT_SHOTS) await page.screenshot({ path: join(process.env.INHERIT_SHOTS, 'kettlewick-after.png') })
})

test('helpers deploy onto the live world and reload preserves drafts and the deployed controller', async ({ page }) => {
  await page.goto('/')
  const tree = page.getByLabel('Project files')
  const deploy = page.getByRole('button', { name: 'Deploy' })
  await expect(page.getByRole('textbox', { name: 'Player TypeScript' })).toBeVisible()
  await tree.getByRole('button', { name: 'New file' }).click()
  await tree.getByLabel('Project path').fill('lib/nested/helpers.ts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await expect(tree.getByRole('alert')).toContainText('directly in lib/')
  await tree.getByLabel('Project path').fill('lib/helpers.ts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await edit(page, 'import { memory } from "inherit"; export function tally() { memory.count = (memory.count ?? 0) + 1 }')
  await tree.getByRole('button', { name: 'main.ts' }).click()
  const main = 'import { tally } from "./lib/helpers"; export function onTick() { tally() }'
  await edit(page, main)
  const before = (await saved(page)).world.tick
  await page.keyboard.press('Control+Enter')
  await expect(deploy).toBeHidden()
  await expect.poll(async () => (await saved(page)).world.memory.count).toBeGreaterThan(0)
  const draft = main + '\n// next change'
  await edit(page, draft)
  await expect(deploy).toBeVisible()
  await page.reload()
  await expect(deploy).toBeEnabled()
  await expect(page.locator('.view-lines')).toContainText('next change')
  const restored = await saved(page)
  expect(restored.world.tick).toBeGreaterThan(before)
  expect(restored.deployed['main.ts']).toBe(main)
  expect(restored.files['main.ts']).toBe(draft)
  await edit(page, main)
  await expect(deploy).toBeHidden()
  await edit(page, draft)
  await deploy.click()
  await expect(deploy).toBeHidden()
  page.once('dialog', dialog => dialog.dismiss())
  await settings(page, 'Start over')
  await expect(tree.getByRole('button', { name: 'lib/helpers.ts' })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await settings(page, 'Start over')
  await expect(tree.getByRole('button', { name: 'lib/helpers.ts' })).toBeHidden()
  await expect(page.locator('.view-lines')).toContainText('Uncle Ambrose')
  expect((await saved(page)).world.memory).toEqual({})
})

test('visibility suspends the worker clock and resumes the same works', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Running', { exact: true })).toBeVisible()
  await expect.poll(async () => (await saved(page)).world.tick).toBeGreaterThan(0)
  async function hidden(value: boolean) {
    await page.evaluate(flag => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: flag })
      document.dispatchEvent(new Event('visibilitychange'))
    }, value)
  }
  await hidden(true)
  // Allow an in-flight snapshot to arrive, then observe two site tick intervals.
  await page.waitForTimeout(550)
  const frozen = (await saved(page)).world
  await page.waitForTimeout(1050)
  expect((await saved(page)).world).toEqual(frozen)
  await hidden(false)
  await expect.poll(async () => (await saved(page)).world.tick).toBeGreaterThan(frozen.tick)
})
