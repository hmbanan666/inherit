import { chapterCapture } from './chapter-capture'
import { expect, type Page } from '@playwright/test'

export async function photo(page: Page, name: string) {
  await (await chapterCapture(page))('workshop/details/'+name)
}
export async function pasteProjectFile(page: Page, source: string, label: string) {
  await page.getByRole('textbox',{name:label}).waitFor()
  await page.context().grantPermissions(['clipboard-read','clipboard-write'])
  await page.bringToFront()
  await page.evaluate(text=>navigator.clipboard.writeText(text),source)
  await page.locator('.monaco-editor .overflow-guard').click({position:{x:110,y:40},timeout:5000})
  await page.keyboard.press('Control+a')
  await page.keyboard.press('Control+v')
  await expect.poll(() => page.evaluate(() => {
    const id = new URLSearchParams(location.search).get('pack')
    const save = JSON.parse(localStorage.getItem('inherit.pack.'+id) ?? 'null')
    return Object.values(save?.project.working ?? {})
  })).toContain(source)
}
export async function edit(page: Page, source: string, append = false) {
  await page.getByRole('textbox', { name: 'Factory controller TypeScript' }).focus()
  await page.keyboard.press(append ? 'Control+End' : 'Control+a')
  for (const [index, line] of source.split('\n').entries()) {
    if (index) {
      await page.keyboard.press('Enter')
      await page.keyboard.press('Shift+Home')
    }
    if (line) await page.keyboard.insertText(line)
    // Keep the line supplied by the player without a second auto-inserted closing brace.
    await page.keyboard.press('Control+Shift+End')
    await page.keyboard.press('Delete')
  }
}
/** Seed a reachable chapter boundary only for tests that exercise persistence. */
export async function savedShed(page: Page, id: string, speed = 1) {
  const { createCampaign, jumpToStep } = await import('../../packages/sim/src/index')
  const { workshopSave } = await import('../../packages/sim/src/packs/workshop/save')
  const { workshopStarter } = await import('../../packages/sim/src/packs/workshop/starter')
  const campaign = jumpToStep(createCampaign(), id)
  campaign.project.working = workshopStarter(id, campaign.project.working).files
  const raw = JSON.stringify(workshopSave(campaign, 'main.ts', false))
  await page.addInitScript(raw => {
    if (!localStorage.getItem('inherit.pack.workshop')) localStorage.setItem('inherit.pack.workshop', raw)
  }, raw)
  await openShed(page, '?speed=' + speed)
}

export async function openShed(page: Page, query = '') {
  await page.goto('/?pack=workshop' + (query ? '&' + query.slice(1) : ''))
  await expect(page.getByTestId('primary-button')).toBeEnabled()
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await expect(page.locator('.project-editor .view-lines')).toBeVisible()
  if (await page.getByTestId('drawer').isVisible()) await page.getByRole('button', {name: 'Got it'}).click()
}

export async function openTool(page: Page, tool: 'learn' | 'hints' | 'api' | 'console') {
  if (!await page.getByTestId('drawer').isVisible()) await page.getByTestId('hint').click()
  await page.getByTestId('drawer-' + tool).click()
}
