import { expect, test, type Page } from '@playwright/test'
import { chapterCapture } from './chapter-capture'
import { lessons } from '../../packages/sim/src/lessons'
import { applyChapterHint } from '../../packages/sim/src/reference/chapter-one'
import { edit, openShed } from './workshop'

function browserErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  return errors
}

test('play every request from the visible hints, build the bridge and pay the tab', async ({ page }) => {
  test.setTimeout(300000)
  const errors = browserErrors(page)
  const capture = await chapterCapture(page)
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  const card = page.getByTestId('task-card')
  const primary = page.getByTestId('primary-button')
  const next = page.getByTestId('continue')
  const solved = page.getByTestId('solved-card')
  await openShed(page, '?speed=32')
  const visibleStarter = await page.locator('.view-line').allTextContents()
  let files: Record<string, string> = { 'main.ts': visibleStarter.map(line => line.replaceAll('\u00a0', ' ').trimEnd()).join('\n') }

  for (const [index, step] of lessons.entries()) {
    await test.step(step.id, async () => {
      const prefix = String(index + 1).padStart(2, '0') + '-' + step.id
      await expect(card.getByRole('heading')).toHaveText(step.title)
      await expect(page.getByTestId('speech')).toContainText(step.story)
      if (step.id === 'bram-smelt') {
        await expect(card.locator('pre')).toContainText('function smelt() {')
        await expect(card.locator('pre')).not.toContainText('take("mine")')
      }
      if (index < 8) await capture(prefix + '-brief')
      for (const label of ['Hint', 'Show places and functions', 'Show exact lines']) await button(label).click()
      const lines = await card.locator('pre.hint').innerText()
      await expect(card.locator('pre.hint')).toHaveText(step.hints[2])
      if (step.id === 'bram-loop') {
        const calls = page.locator('.view-line').filter({ has: page.locator('.call-to-move') })
        await expect(calls).toHaveText(['smelt()', 'ship()'])
        for (const call of await calls.all()) await expect(call.locator('.call-to-move').first()).toBeInViewport({ ratio: 1 })
      }
      if (index < 8) await capture(prefix + '-hint')
      await button('Hide hint').click()
      if (step.id === 'harrow-tab') {
        await page.getByTestId('nav-inbox').click()
        if (index < 8) await capture(prefix + '-reply')
        await button(lines).click()
        await button('Close drawer').click()
      } else if (step.id === 'harrow-deed') {
        await button('Pay debt').click()
        await page.getByRole('button', { name: /Pay balance/ }).click()
      } else {
        const updated = applyChapterHint(files, { ...step, hints: ['', '', lines] })
        const tree = page.getByRole('region', { name: 'Project files' })
        if (step.id === 'mayor-tools') {
          await tree.getByRole('button', { name: 'New file' }).click()
          await tree.getByLabel('Project path').fill('tools.ts')
          await tree.getByRole('button', { name: 'Create', exact: true }).click()
        }
        for (const [file, source] of Object.entries(updated)) {
          if (source === files[file]) continue
          if (await tree.isVisible()) await tree.getByRole('button', { name: file, exact: true }).click()
          await edit(page, source)
          await page.keyboard.press('Control+Home')
        }
        files = updated
        await primary.click()
        if (step.button === 'run') {
          await expect(async () => {
            if (await next.isVisible()) return
            await expect(primary).toBeEnabled()
            if (!await next.isVisible()) await primary.click()
            await expect(next).toBeVisible({ timeout: 600 })
          }).toPass({ timeout: 15000 })
        }
        if (step.id === 'bram-loop') {
          await expect(page.locator('.cart-load')).toHaveText(/[12] \/ 3 delivered/)
          await expect(page.locator('.call-to-move')).toHaveCount(0)
          await capture('bram-deploy-filling')
        }
      }
      await expect(solved).toContainText(step.solved.did, { timeout: 45000 })
      await expect(page.getByTestId('speech')).toContainText(step.solved.reaction)
      if (step.id === 'harrow-tab') {
        await expect(solved).toContainText('12 coins for three more ingots')
        await expect(page.getByTitle('Workshop money')).toContainText('64 coins')
        await expect(page.getByTestId('nav-orders')).toBeHidden()
      }
      if (index < 8) await capture(prefix + '-solved')
      if (step.id === 'bram-loop') {
        await next.click()
        await expect(page.locator('.wallet')).toBeVisible()
        await capture('reveal-coins')
        await next.click()
        await expect(page.getByTestId('nav-town')).toBeVisible()
        await capture('reveal-town')
        await page.getByTestId('nav-town').click()
        await expect(page.locator('.town-print canvas')).toBeVisible()
        await capture('town')
        await page.getByTestId('nav-shed').click()
        await next.click()
        await expect(page.getByTestId('nav-inbox')).toBeVisible()
        await next.click()
        await page.getByTestId('nav-inbox').click()
        await expect(page.getByRole('heading', { name: 'Your uncle’s tab' })).toBeVisible()
        await capture('reveal-inbox-letter')
        await button('Close drawer').click()
      }
      await next.click()
    })
  }
  await expect(page.getByRole('region', { name: 'Chapter complete' })).toContainText('The shed is yours.')
  await page.getByTestId('nav-town').click()
  await expect(page.locator('.town-print')).toHaveAccessibleName(/Riverside bridge working/)
  await expect(button('Pay debt')).toHaveText('Debt 0')
  expect(errors).toEqual([])
})

test('late jumps open the expected machines, files and town changes', async ({ page }) => {
  const errors = browserErrors(page)
  await openShed(page, '?step=bridge-fit&speed=8')
  await expect(page.getByTestId('task-card')).toContainText('Fit a plate to a coil')
  await expect(page.getByTestId('place-assembler')).toBeVisible()
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByRole('button', { name: 'Project files' }).click()
  await expect(page.getByRole('button', { name: 'tools.ts', exact: true })).toBeVisible()
  await openShed(page, '?step=harrow-deed&speed=8')
  await expect(page.getByTestId('task-card')).toContainText('Take the deed')
  await page.getByTestId('nav-town').click()
  await expect(page.locator('.town-print')).toHaveAccessibleName(/Riverside bridge working/)
  await expect(page.getByRole('button', { name: 'Pay debt' })).toContainText('600')
  expect(errors).toEqual([])
})
