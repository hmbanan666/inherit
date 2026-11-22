import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, type Page } from '@playwright/test'

export async function photo(page: Page, name: string) {
  const dir = process.env.INHERIT_SHOTS
  if (!dir) return
  await mkdir(dir, { recursive: true })
  await page.screenshot({ path: join(dir, name + '.png') })
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
export async function openShed(page: Page, query = '') {
  await page.goto('/?pack=workshop' + (query ? '&' + query.slice(1) : ''))
  await expect(page.getByTestId('primary-button')).toBeEnabled()
  await expect(page.locator('.pixi-mount canvas')).toBeVisible()
  await expect(page.locator('.project-editor .view-lines')).toBeVisible()
}
