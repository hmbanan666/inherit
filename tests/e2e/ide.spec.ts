import { edit as replaceCode, photo, openShed } from './workshop'
import { expect, test, type Page } from '@playwright/test'

const main = 'import { feed } from "./lib/drive"\nexport function onTick() {\n  feed()\n}'
const helper = 'import {take} from "inherit"\nexport function feed() {\n  take("mine")\n  console.log("ore moving")\n}'
async function projectFiles(page: Page) {
  const tree = page.getByRole('region', {name:'Project files'})
  if (!await tree.isVisible()) {
    await button(page,'Settings').click()
    await button(page,'Project files').click()
  }
  return tree
}

async function workshop(page: Page, unlock = true) {
  await openShed(page, unlock ? '?step=mayor-tools&speed=8' : '')
  if (!unlock) return
  await replaceCode(page, main)
  const tree = await projectFiles(page)
  await tree.getByRole('button', { name: 'New file' }).click()
  await tree.getByLabel('Project path').fill('lib/drive.ts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await replaceCode(page, helper)
  await tree.getByRole('button', { name: 'main.ts', exact: true }).click()
  await page.getByTestId('primary-button').click()
  await expect(page.locator('.live')).toHaveText('Live')
  await button(page, 'Settings').click()
  await button(page, 'Project files').click()
}
const button = (page: Page, name: string) => page.getByRole('button', { name, exact: true })
const tab = (page: Page, name: string) =>
  page.locator('.editor-dock .file-tabs').getByRole('button', { name, exact: true })
test('first shift opens a single player file', async ({ page }) => {
  await workshop(page, false)
  await expect(tab(page, 'main.ts')).toBeVisible()
  await expect(
    page.locator('.editor-dock').getByRole('button', { name: 'main.ts', exact: true }),
  ).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Project files' })).toHaveCount(0)
  await expect(page.locator('.my-library')).toHaveCount(0)
})

test('first shift distinguishes TypeScript tokens and explains the available calls', async ({ page }) => {
  await workshop(page, false)
  const tokens = page.locator('.project-editor .view-line span[class*="mtk"]')
  await replaceCode(page, '// The shed is yours.\nimport { take } from "inherit"\nexport function dig(): string { return "rock" }\nconst n = 42')
  const samples = ['import', '"inherit"', 'dig', '42', '// The shed']
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
  await expect(panel).toContainText('What inherit exports')
  await expect(panel.getByRole('heading', {name:/^take/})).toBeVisible()
  await expect(panel.locator('article')).toHaveCount(2)
  expect(await panel.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await photo(page, 'api-reference')
})

test('the compact workshop panel leaves every API card reachable at 1440 × 900', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await workshop(page)
  await tab(page, 'API reference').click()
  const reference = page.getByRole('region', { name: 'API reference' })
  const tabs = page.getByRole('tablist', { name: 'Workshop tools' })
  const footer = page.locator('.statusbar')
  for (const name of ['Checks', 'Console']) {
    await tabs.getByRole('tab', { name }).click()
    const panel = page.getByRole('tabpanel', { name })
    const rect = (await panel.boundingBox())!
    expect(rect.height).toBeGreaterThan(0)
    expect(rect.height).toBeLessThanOrEqual(130)
    expect(rect.y + rect.height).toBeLessThanOrEqual((await footer.boundingBox())!.y + 1)
    const refRect = (await reference.boundingBox())!
    expect(refRect.y + refRect.height).toBeLessThanOrEqual((await tabs.boundingBox())!.y)
    const floor = reference.locator('section').filter({ has: page.getByRole('heading', { name: 'What inherit exports', exact: true }) })
    for (const example of [floor.locator('.example').last(), reference.locator('.example').last()]) {
      await example.scrollIntoViewIfNeeded()
      expect(await example.evaluate(el => {
        const r = el.getBoundingClientRect()
        return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))
      })).toBe(true)
    }
    await button(page, 'Collapse workshop panel').click()
    await expect(panel).toBeHidden()
    expect((await reference.boundingBox())!.height).toBeGreaterThan(refRect.height)
    await button(page, 'Expand workshop panel').click()
    await expect(panel).toBeVisible()
  }
})

test('import completion inside braces lists the unlocked workshop exports', async ({page}) => {
  await workshop(page,false)
  await replaceCode(page,'import {  } from "inherit"')
  await page.keyboard.press('Home')
  for (let i=0;i<9;i++) await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Control+Space')
  const list = page.locator('.suggest-widget.visible')
  await expect(list).toContainText('take')
  await expect(list).not.toContainText(/repair|buy/)
  await expect(list).toContainText('put')
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

test('an unknown import is marked until the player uses an unlocked name', async ({page}) => {
  await workshop(page,false)
  const markers = page.locator('.project-editor .squiggly-error')
  await replaceCode(page,'import {repair} from "inherit"; repair("mine")')
  await expect(markers.first()).toBeVisible()
  await replaceCode(page,'import {take} from "inherit"; console.log(take("mine"))')
  await expect(markers).toHaveCount(0)
})

test('follow definitions and references across files, search the draft and organize a folder', async ({
  page,
}) => {
  await workshop(page)
  const editor = page.getByRole('region', { name: 'Controller files' })
  await editor
    .locator('.view-line')
    .filter({ hasText: 'feed()' })
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
  await replaceCode(page, helper.replace('take("mine")', 'unknownCommand("mine")'))
  await expect(editor.locator('.squiggly-error').first()).toBeVisible()
  await expect(page.locator('.editor-foot')).toContainText('Working copy')

  const tree = await projectFiles(page)
  await tree.getByRole('button', { name: 'New folder' }).click()
  await tree.getByLabel('Project path').fill('parts')
  await tree.getByRole('button', { name: 'Create' }).click()
  await page.reload()
  await projectFiles(page)
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
  await (await projectFiles(page))
    .getByRole('button', { name: 'lib/drive.ts' })
    .click()
  await replaceCode(page, 'export function feed() {\n  throw new Error("stuck valve")\n}')
  await expect(page.locator('.editor-foot')).toContainText('Working copy')
  await page.getByRole('tab', { name: 'Console' }).click()
  await page.keyboard.press('Control+s')
  const output = page.getByRole('region', { name: 'Program console' })
  const location = output.getByRole('button', { name: 'lib/drive.ts:2' })
  await expect(location).toBeVisible()
  await expect(output.getByRole('listitem').filter({ hasText: 'stuck valve' })).toHaveCSS('color', 'rgb(231, 163, 139)')
  await (await projectFiles(page)).getByRole('button',{name:'main.ts',exact:true}).click()
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
  const tree = await projectFiles(page)
  for (const path of ['lib/drive.ts', 'main.ts', 'lib/drive.ts']) {
    await page.locator('.project-editor .view-lines').first().click()
    await page.keyboard.press('ArrowLeft')
    await tree.getByRole('button', { name: path, exact: true }).dispatchEvent('click')
    await expect(tab(page, path)).toHaveAttribute('aria-pressed', 'true')
  }
  expect(errors).toEqual([])
})
