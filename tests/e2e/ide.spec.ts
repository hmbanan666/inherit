import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { createCampaign, deployGameProject, serializeSave } from '../../packages/sim/src/index'

const main = [
  'import type { Factory } from "inherit"',
  'import { feed } from "./lib/drive"',
  'export function onTick(ctx: Factory) {',
  '  feed(ctx)',
  '  ctx.work("furnace")',
  '}',
].join('\n')
const helper = [
  'import type { Factory } from "inherit"',
  'export function feed(ctx: Factory) {',
  '  ctx.dig("mine")',
  '  console.log("ore moving")',
  '}',
].join('\n')

async function workshop(page: Page, unlock = true) {
  if (unlock) {
    const c = createCampaign()
    c.town.beat = 9
    c.project.working = { 'main.ts': main, 'lib/drive.ts': helper }
    deployGameProject(c)
    await page.addInitScript((save) => {
      if (!localStorage.getItem('inherit.workshop.v1')) localStorage.setItem('inherit.workshop.v1', save)
    }, serializeSave(c))
  }
  await page.goto('/')
  await expect(page.locator('.project-editor .view-lines').first()).toBeVisible()
}
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const tab = (page: Page, name: string) =>
  page.locator('.editor-dock .file-tabs').getByRole('button', { name, exact: true })
async function photo(page: Page, name: string) {
  const directory = process.env.INHERIT_SHOTS
  if (!directory) return
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name + '.png'), animations: 'disabled' })
}
async function replaceCode(page: Page, text: string) {
  await page.locator('.project-editor .view-lines').first().click()
  await page.keyboard.press('Control+a')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.evaluate((source) => navigator.clipboard.writeText(source), text)
  await page.keyboard.press('Control+v')
}

test('first shift opens a single player file', async ({ page }) => {
  await workshop(page, false)
  await expect(tab(page, 'main.ts')).toBeVisible()
  await expect(
    page.locator('.editor-dock').getByRole('button', { name: 'main.ts', exact: true }),
  ).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Project files' })).toHaveCount(0)
  await expect(button(page, 'Quick open')).toHaveCount(0)
})

test('first shift distinguishes TypeScript tokens and explains the available calls', async ({ page }) => {
  await workshop(page, false)
  const tokens = page.locator('.project-editor .view-line span[class*="mtk"]')
  await replaceCode(page, '// The shed is yours.\nimport type { Factory } from "inherit"\nexport function onTick(ctx: Factory) { console.log("tick") }')
  const samples = ['import', '"inherit"', 'Factory', 'onTick', 'ctx', '// The shed']
  await expect.poll(() => tokens.evaluateAll((spans, samples) => {
    const colors = new Set<string>()
    for (const sample of samples) {
      const token = spans.find(span => span.textContent?.replaceAll('\u00a0', ' ').includes(sample))
      if (token) colors.add(getComputedStyle(token).color)
    }
    return colors.size
  }, samples)).toBe(samples.length)
  await photo(page, 'main-ts')
  await tab(page, 'API reference').click()
  const panel = page.getByRole('region', { name: 'API reference' })
  await expect(panel).toContainText('onTick(): void')
  await expect(panel).not.toContainText(/Factory|ctx\.|mine\.|repair|orders\(/)
  await button(page, 'Deploy').click()
  await expect(panel.getByRole('heading', { name: 'mine.dig(): boolean' })).toBeVisible()
  await expect(panel).toContainText('Dig one rock. Wait when the belt is full.')
  await expect(panel).not.toContainText(/connect|smelt|ctx\./)
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await photo(page, 'api-reference')
})

test('Bram waits for a callable draft and a message from the running tick', async ({ page }) => {
  await workshop(page, false)
  const card = page.getByRole('region', { name: 'Current request' })
  await replaceCode(page, 'const shift = () => {}; export { shift as onTick }')
  await expect(card).toContainText('2/7')
  await replaceCode(page, 'export const onTick = 42')
  await expect(card).toContainText('1/7')
  await replaceCode(page, 'export function onTick() { missing() }')
  await expect(page.locator('.squiggly-error').first()).toBeVisible()
  await expect(card).toContainText('1/7')
  await replaceCode(page, 'console.log("loaded"); export function onTick() {}')
  await expect(card).toContainText('2/7')
  await button(page, 'Deploy').click()
  await expect(page.getByRole('region', { name: 'Program console' })).toContainText('loaded')
  await expect(card).toContainText('2/7')
  await replaceCode(page, 'export function onTick() { console.log("running") }')
  await button(page, 'Deploy').click()
  await expect(card).toContainText('3/7')
  await page.reload()
  await expect(card).toContainText('3/7')
})

test('invalid or missing palette values preserve distinct syntax colors', async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.setProperty('--syntax-keyword', 'initial')
      document.documentElement.style.setProperty('--syntax-number', 'invalid')
    })
  })
  await workshop(page, false)
  await replaceCode(page, 'export function onTick() { return 42 }')
  const tokens = page.locator('.project-editor .view-line span[class*="mtk"]')
  const keyword = tokens.filter({ hasText: 'return' })
  const number = tokens.filter({ hasText: '42' })
  await expect(keyword).toHaveCSS('color', 'rgb(222, 169, 237)')
  await expect(number).toHaveCSS('color', 'rgb(246, 173, 143)')
})

for (const file of ['main.ts', 'lib/drive.ts']) {
  test(`sandbox globals have zero error markers in ${file}`, async ({ page }) => {
    // Editing works even while optional preview assets are unavailable.
    await page.route('**/preview.worker-*.js', (route) => route.abort())
    await workshop(page, file !== 'main.ts')
    if (file !== 'main.ts') {
      await page.getByRole('region', { name: 'Project files' }).getByRole('button', { name: file }).click()
    }
    const program = [
      'import type { Factory } from "inherit"',
      `export function ${file === 'main.ts' ? 'onTick' : 'feed'}(ctx: Factory) {`,
      '  memory.room = ctx.space("mine")',
      '  console.log(memory.room)',
      '}',
      'test("room", ctx => { assert(ctx.tick >= 0); equal(memory.room, true) })',
    ].join('\n')
    const markers = page.locator('.project-editor .squiggly-error')
    // Wait for a semantic error first so a worker still starting up cannot give a false pass.
    await replaceCode(page, program.replace('ctx.space', 'ctx.dispatch'))
    await expect(markers.first()).toBeVisible()
    await replaceCode(page, program)
    await expect(markers).toHaveCount(0)
  })
}

test('follow definitions and references across files, search the draft and organize a folder', async ({
  page,
}) => {
  await workshop(page)
  const editor = page.getByRole('region', { name: 'Controller files' })
  await editor
    .locator('.view-line')
    .filter({ hasText: 'feed(ctx)' })
    .getByText('feed', { exact: true })
    .click()
  await page.keyboard.press('F12')
  await expect(tab(page, 'lib/drive.ts')).toHaveAttribute('aria-pressed', 'true')
  await editor
    .locator('.view-line')
    .filter({ hasText: 'function feed' })
    .getByText('feed', { exact: true })
    .click()
  await page.keyboard.press('Shift+F12')
  await expect(editor.locator('.reference-zone-widget')).toContainText('main.ts')
  await page.keyboard.press('Escape')
  await tab(page, 'API reference').click()
  await page.keyboard.press('Control+p')
  await page.getByRole('textbox', { name: 'Find file' }).fill('main')
  await page.keyboard.press('Enter')
  await expect(tab(page, 'main.ts')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Control+Shift+f')
  await page.getByRole('textbox', { name: 'Search project' }).fill('ore moving')
  await photo(page, 'ide-project-search')
  await editor.getByRole('button', { name: /lib\/drive.ts:4/ }).click()
  await expect(tab(page, 'lib/drive.ts')).toHaveAttribute('aria-pressed', 'true')
  await replaceCode(page, helper.replace('ctx.dig', 'ctx.unknownCommand'))
  await expect(editor.locator('.squiggly-error').first()).toBeVisible()
  await expect(page.getByText('Working copy', { exact: true })).toBeVisible()

  const tree = page.getByRole('region', { name: 'Project files' })
  await tree.getByRole('button', { name: 'New folder' }).click()
  await tree.getByLabel('Project path').fill('parts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await page.reload()
  await expect(tree.getByRole('button', { name: 'parts/index.ts' })).toBeVisible()
  await tree.getByRole('button', { name: 'New file' }).click()
  await tree.getByLabel('Project path').fill('parts/press.ts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await expect(tab(page, 'parts/press.ts')).toHaveAttribute('aria-pressed', 'true')
  await tree.getByRole('button', { name: 'parts', exact: true }).click()
  await tree.getByRole('button', { name: 'Rename selected' }).click()
  await tree.getByLabel('Project path').fill('presses')
  await tree.getByRole('button', { name: 'Rename', exact: true }).click()
  await expect(tree.getByRole('button', { name: 'presses/press.ts' })).toBeVisible()
  await tree.getByRole('button', { name: 'presses/press.ts' }).click()
  await tree.getByRole('button', { name: 'Delete selected' }).click()
  await tree.getByRole('button', { name: 'Cancel' }).click()
  await expect(tab(page, 'presses/press.ts')).toBeVisible()
  await tree.getByRole('button', { name: 'Delete selected' }).click()
  await tree.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(tab(page, 'presses/press.ts')).toHaveCount(0)
})

test('jump from a controller error to its module and clear the log ring', async ({ page }) => {
  await workshop(page)
  await page
    .getByRole('region', { name: 'Project files' })
    .getByRole('button', { name: 'lib/drive.ts' })
    .click()
  await replaceCode(page, 'export function feed() {\n  throw new Error("stuck valve")\n}')
  await expect(page.getByText('Working copy', { exact: true })).toBeVisible()
  await page.keyboard.press('Control+s')
  const output = page.getByRole('region', { name: 'Program console' })
  const location = output.getByRole('button', { name: 'lib/drive.ts:2' })
  await expect(location).toBeVisible()
  await tab(page, 'main.ts').click()
  await location.click()
  await expect(tab(page, 'lib/drive.ts')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.project-editor .squiggly-error').first()).toBeVisible()
  await photo(page, 'ide-console-error')
  await output.getByRole('button', { name: 'Clear' }).click()
  await expect(output.getByRole('listitem')).toHaveCount(0)
})

test('switching modules while Monaco highlights a word leaves the editor healthy', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await workshop(page)
  const tree = page.getByRole('region', { name: 'Project files' })
  for (const path of ['lib/drive.ts', 'main.ts', 'lib/drive.ts']) {
    await page.locator('.project-editor .view-lines').first().click()
    await page.keyboard.press('ArrowLeft')
    await tree.getByRole('button', { name: path, exact: true }).dispatchEvent('click')
    await expect(tab(page, path)).toHaveAttribute('aria-pressed', 'true')
  }
  expect(errors).toEqual([])
})
