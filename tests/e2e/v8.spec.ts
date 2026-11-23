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

test('Bram offers a quest, the checks sit beside the editor, and credits stay put', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Horseshoes for the mail horse' })).toBeVisible()
  await expect(page.getByLabel('Current request')).toContainText('cart fills')
  await expect(page.getByLabel('Current request')).not.toContainText('Due in')
  await expect(page.getByTestId('take-quest')).toBeVisible()
  await expect(page.getByTestId('complete-quest')).toHaveCount(0)
  await expect(page.getByText('Running', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Inherit showcase' })).toBeVisible()
  await expect(page.getByLabel('Factory map').locator('canvas')).toBeVisible()
  await expect(page.getByLabel('Village').locator('canvas')).toBeVisible()
  const files = page.getByLabel('Project files')
  const fileBox = (await files.boundingBox())!
  const editorBox = (await page.locator('.editor-pane').boundingBox())!
  expect(fileBox.x + fileBox.width).toBeLessThanOrEqual(editorBox.x + 2)
  expect(fileBox.height).toBeGreaterThan(240)
  await expect(files.getByRole('button', { name: 'main.ts' })).toBeVisible()
  await expect(files.getByRole('button', { name: 'lib', exact: true })).toBeVisible()
  await expect(page.locator('.view-lines')).toContainText('const home = false')
  await expect(page.locator('.hud').getByRole('button', { name: /^(Deploy|Pause|Resume|[124]x|Start over)$/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Deploy' })).toBeVisible()
  await expect(page.getByTestId('checks')).toHaveText('Take a quest to see checks')
  await page.getByTestId('take-quest').click()
  await expect(page.getByTestId('checks')).toContainText('Ore reaches the furnace')
  await expect(page.getByTestId('credits')).toHaveText('300 credits')
  await expect(page.getByTestId('complete-quest')).toBeDisabled()
  const request = page.getByLabel('Current request')
  const why = request.locator('.lesson')
  const whyText = await why.innerText()
  await page.waitForTimeout(600)
  await expect(why).toHaveText(whyText)
  await settings(page, 'Charts')
  await expect(page.getByLabel('Factory metrics')).toBeVisible()
  await settings(page, 'API')
  await expect(page.getByLabel('API reference')).toContainText('furnace.smelt()')
  await page.getByRole('tab', { name: 'Console' }).click()
  await expect(page.getByTestId('tick')).toBeVisible()
  await expect(page.getByLabel('API reference')).toBeHidden()
  await page.getByRole('tab', { name: 'Checks' }).click()
  await expect(page.getByLabel('Console', { exact: true })).toBeHidden()
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
  await expect(deploy).toHaveAttribute('data-dirty', 'false')
  await expect.poll(async () => (await saved(page)).world.memory.count).toBeGreaterThan(0)
  const draft = main + '\n// next change'
  await edit(page, draft)
  await expect(deploy).toHaveAttribute('data-dirty', 'true')
  await page.reload()
  await expect(deploy).toBeEnabled()
  await expect(page.locator('.view-lines')).toContainText('next change')
  const restored = await saved(page)
  expect(restored.world.tick).toBeGreaterThan(before)
  expect(restored.deployed['main.ts']).toBe(main)
  expect(restored.files['main.ts']).toBe(draft)
  await edit(page, main)
  await expect(deploy).toHaveAttribute('data-dirty', 'false')
  await edit(page, draft)
  await deploy.click()
  await expect(deploy).toHaveAttribute('data-dirty', 'false')
  page.once('dialog', dialog => dialog.dismiss())
  await settings(page, 'Start over')
  await expect(tree.getByRole('button', { name: 'lib/helpers.ts' })).toBeVisible()
  page.once('dialog', dialog => dialog.accept())
  await settings(page, 'Start over')
  await expect(tree.getByRole('button', { name: 'lib/helpers.ts' })).toBeHidden()
  await expect(page.locator('.view-lines')).toContainText('Uncle Ambrose')
  expect((await saved(page)).world.memory).toEqual({})
})

test('the works keep ticking while the tab is hidden', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('Running', { exact: true })).toBeVisible()
  await expect.poll(async () => (await saved(page)).world.tick).toBeGreaterThan(1)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.waitForTimeout(600)
  const mark = (await saved(page)).world.tick
  await page.waitForTimeout(1200)
  expect((await saved(page)).world.tick).toBeGreaterThan(mark)
})
