import { expect, type Page } from '@playwright/test'

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
export async function openTool(page: Page, tool: 'learn' | 'hints' | 'api' | 'console') {
  if (!await page.getByTestId('drawer').isVisible()) await page.getByTestId('hint').click()
  await page.getByTestId('drawer-' + tool).click()
}
