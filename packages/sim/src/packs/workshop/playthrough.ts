import { expect, test, type Page } from '@playwright/test'
import { chapterCapture } from '../../../../../tests/e2e/chapter-capture'
import { edits } from './starter'
import { lessons } from './chapter'
import { workshopReference } from './reference/chapter-one'
import { pasteProjectFile, openTool } from '../../../../../tests/e2e/workshop'

function browserErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()) })
  return errors
}

test('play every workshop reference in the editor, build the bridge and pay the tab', async ({ page }) => {
  test.setTimeout(300000)
  page.setDefaultTimeout(10000)
  const errors = browserErrors(page)
  const capture = await chapterCapture(page)
  const button = (name: string) => page.getByRole('button', { name, exact: true })
  const card = page.getByTestId('task-card')
  const primary = page.getByTestId('primary-button')
  const next = page.getByTestId('continue')
  const solved = page.getByTestId('solved-card')
  const markedLines = page.locator('.view-line').filter({ has: page.locator('.call-to-move') })
  async function expectMarkedLines(lines: string[]) {
    await expect(markedLines).toHaveText(lines)
    for (const line of await markedLines.all()) {
      await expect(line.locator('.call-to-move').first()).toBeInViewport({ ratio: 1 })
    }
  }
  await page.goto('/?speed=32')
  await page.getByTestId('pack-workshop').click()
  await expect(page.locator('.view-lines')).toBeVisible()
  await expect(primary).toBeEnabled()
  for (const [index, step] of lessons.entries()) {
    await test.step(step.id, async () => {
      const prefix = 'workshop/'+step.id+'/'
      await expect(card.getByRole('heading')).toHaveText(edits[step.id].goal)
      await expect(page.getByTestId('speech')).toContainText(step.story)
      if (step.id === 'bram-smelt') {
        await expectMarkedLines(['take("mine")', 'put("furnace")'])
        await expect(page.locator('.view-lines')).toContainText('TODO: Give the two furnace moves')
      }
      if (step.id === 'bram-loop') {
        await expectMarkedLines(['smelt()', 'ship()'])
        await expect(page.locator('.view-lines')).toContainText('TODO: Let the clock fill')
      }
      await capture(prefix + 'start')
      await openTool(page, 'hints')
      await button('Show hint 1 of 2').click()
      await button('Show hint 2 of 2').click()
      if (index < 8) await capture(prefix + 'hint')
      await button('Close drawer').click()
      {
        const updated = workshopReference(step)
        const tree = page.getByRole('region', { name: 'Project files' })
        if (step.id === 'mayor-tools') {
          await tree.getByRole('button', { name: 'New file' }).click()
          await tree.getByLabel('Project path').fill('tools.ts')
          await tree.getByRole('button', { name: 'Create', exact: true }).click()
        }
        for (const [file, source] of Object.entries(updated)) {
          if (await tree.isVisible()) await tree.getByRole('button', { name: file, exact: true }).click()
          await pasteProjectFile(page,source,'Factory controller TypeScript')
          await page.keyboard.press('Control+Home')
        }
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
          await capture(prefix+'deploy-filling')
        }
      }
      await expect(solved).toContainText(step.solved.did, { timeout: 45000 })
      await expect(page.getByTestId('speech')).toContainText(step.solved.reaction)
      if (step.id === 'harrow-tab') {
        await expect(solved).toContainText('12 coins for three more ingots')
        await expect(page.getByTestId('nav-orders')).toBeHidden()
      }
      await capture(prefix + 'solved')
      await next.click()
      if (step.id === 'bram-loop') {
        await expect(page.getByTestId('drawer')).toContainText('64 coins')
        await expect(button('Pay later')).toBeVisible()
        await capture(prefix + 'next')
      }
    })
  }
  const finish = page.getByRole('region', {name: 'Uncle’s Workshop'})
  await expect(finish).toContainText('The shed is yours.')
  await expect(finish.getByRole('listitem')).toHaveText(lessons.map(lesson => lesson.solved.idea))
  await expect(finish.getByRole('link', {name: 'Back to game packs'})).toHaveAttribute('href', '/')
  await expect(finish.getByRole('link', {name: /Next pack/})).toHaveCount(0)
  await expect(page.getByTestId('floor')).toBeVisible()
  await expect(page.getByRole('banner').getByRole('link', {name: 'Showcase', exact: true})).toBeVisible()
  await capture('workshop/complete')
  await finish.getByRole('button', {name: 'Replay this pack'}).click()
  await page.getByRole('dialog').getByRole('button', {name: 'Replay this pack'}).click()
  await expect(page.getByTestId('task-card')).toContainText('Lift a rock from the mine')
  await expect(page.getByRole('navigation', {name: 'Workshop sections'})).toBeHidden()
  await expect(page.getByRole('textbox', {name: 'Factory controller TypeScript'})).toBeFocused()
  expect(errors).toEqual([])
})
