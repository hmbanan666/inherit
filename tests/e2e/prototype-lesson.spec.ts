import { expect, test, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import beginner from '../../packages/sim/src/packs/beginner/pack'

const [hello, sign, order] = beginner.lessons

/** Frames for the PR and the rationale doc, under INHERIT_SHOTS/prototype/lesson-v7. */
async function frames(page: Page) {
  const root = process.env.INHERIT_SHOTS
  const dir = root && join(root, 'prototype', 'lesson-v7')
  if (dir) await mkdir(dir, { recursive: true })
  return async (name: string, settle = 500) => {
    if (!dir) return
    await page.mouse.move(0, 0)
    // Entrances last under half a second. Confetti is still in the air after that.
    await page.waitForTimeout(settle)
    await page.screenshot({ path: join(dir, name + '.png') })
  }
}
async function replaceCode(page: Page, source: string) {
  await page.getByTestId('code').focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.type(source)
  await expect(page.getByTestId('code')).toHaveValue(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
}

test('lesson screen v7 prototype walks lessons 1 to 3 with one obvious next step', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
  await page.setViewportSize({ width: 1280, height: 800 })
  const shot = await frames(page)
  await page.goto('/prototype/lesson')

  const code = page.getByTestId('code'), run = page.getByTestId('primary-button'), world = page.getByTestId('world')
  const goal = page.getByTestId('task-card').getByRole('heading')
  const next = page.getByTestId('task-card').locator('[aria-current=step]')
  const card = page.getByTestId('solved-card'), feedback = page.getByTestId('feedback')

  await test.step('lesson 1 opens ready to type, with help and the map closed', async () => {
    await expect(goal).toHaveText(hello.goal)
    await expect(code).toBeFocused()
    await expect(code).toHaveValue(/say\(""\)$/)
    await expect(next).toHaveText(/Type a greeting between the quotes/)
    await expect(run).toHaveClass(/calm/)
    await expect(page.getByTestId('drawer')).toBeHidden()
    await expect(page.getByTestId('course-map')).toBeHidden()
    await expect(world.getByTestId('speech')).toHaveText('Mila has nothing to say yet')
    const box = (await run.boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(128)
    expect(box.x + box.width).toBeGreaterThan(1240)
    await shot('01-lesson-1-idle')
  })

  await test.step('a typo gets a plain-words message, a marked token and a confused scene', async () => {
    await replaceCode(page, 'sya("Hello")')
    await run.click()
    await expect(feedback).toContainText('Check the spelling on line 1')
    await expect(feedback).toContainText('The game does not know sya. Did you mean say?')
    await expect(page.locator('.proto-editor .marked')).toHaveText('sya')
    await expect(world.getByTestId('speech')).toHaveText('?')
    await expect(card).toBeHidden()
    await expect(code).toBeFocused()
    await shot('04-lesson-1-typo')
  })

  await test.step('typing the greeting turns Run into the next step', async () => {
    await page.getByRole('button', { name: 'Jump to lesson 1' }).click()
    await expect(code).toHaveValue(/say\(""\)$/)
    await expect(code).toBeFocused()
    await page.keyboard.type('Hello, traveller!')
    await expect(code).toHaveValue(/say\("Hello, traveller!"\)$/)
    await expect(next).toHaveText(/Press\s*Run/)
    await expect(run).toHaveClass(/ready/)
    await shot('02-lesson-1-typing')
  })

  await test.step('Run plays in the scene, then one centred card offers one Continue', async () => {
    await page.keyboard.press('Control+Enter')
    await expect(run).toHaveText(/Playing/)
    await expect(world.getByTestId('speech')).toHaveText('Hello, traveller!')
    await expect(page.getByTestId('checks').locator('[data-state=pass]')).toHaveCount(2)
    await shot('03-lesson-1-run', 250)
    await expect(card).toContainText(hello.solved.reaction)
    await expect(card).toContainText(hello.solved.did)
    await expect(card.getByRole('button')).toHaveCount(1)
    await expect(card.locator('a')).toHaveCount(0)
    // The card rises into place, so wait for it to settle before measuring.
    await expect.poll(async () => {
      const area = (await world.boundingBox())!, box = (await card.boundingBox())!
      return Math.max(Math.abs(box.x + box.width / 2 - (area.x + area.width / 2)),
        Math.abs(box.y + box.height / 2 - (area.y + area.height / 2)))
    }).toBeLessThan(2)
    await shot('05-lesson-1-solved')
    await page.keyboard.press('Enter')
  })

  await test.step('lesson 2 asks for the quotes and explains a near miss from the scene', async () => {
    await expect(goal).toHaveText(sign.goal)
    await expect(code).toBeFocused()
    await expect(code).toHaveValue(/paintSign\(\)$/)
    await shot('06-lesson-2-idle')
    await page.keyboard.type('"moon ferry')
    await page.keyboard.press('Control+Enter')
    await expect(feedback).toContainText('The sign says “moon ferry”. The ticket says “Moon Ferry”. Capital letters count.')
    await expect(page.getByTestId('checks').locator('[data-state=miss]')).toHaveCount(1)
    await shot('07-lesson-2-near-miss')
    await replaceCode(page, 'paintSign("Moon Ferry")')
    await page.keyboard.press('Control+Enter')
    await expect(card).toContainText(sign.solved.reaction)
    await card.getByTestId('continue').click()
  })

  await test.step('lesson 3 asks for a whole line and a guess before Run', async () => {
    await expect(goal).toHaveText(order.goal)
    await expect(code).toBeFocused()
    await shot('08-lesson-3-idle')
    await page.keyboard.type('say("We are off!')
    await expect(next).toHaveText(/Make a guess/)
    await page.keyboard.press('Control+Enter')
    await expect(card).toBeHidden()
    await page.getByTestId('guess').getByRole('button', { name: order.prediction!.answer }).click()
    await expect(run).toHaveClass(/ready/)
    await shot('09-lesson-3-ready')
    await run.click()
    await expect(world.getByRole('list', { name: 'Departure board' })).toContainText('We are off!')
    await expect(card).toContainText(order.solved.reaction)
    await expect(card).toContainText('You called it.')
    await shot('10-lesson-3-solved')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('prototype-end')).toBeVisible()
  })

  await test.step('the course map and help open only on request and leave the frame alone', async () => {
    await page.getByRole('button', { name: 'Jump to lesson 1' }).click()
    await expect(goal).toHaveText(hello.goal)
    const before = [await world.boundingBox(), await page.locator('.proto-editor').boundingBox()]
    await page.getByTestId('progress').click()
    await expect(page.getByTestId('course-map')).toContainText(sign.goal)
    await expect(page.getByTestId('course-map').getByRole('button', { name: sign.goal })).toBeDisabled()
    await shot('11-course-map')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('course-map')).toBeHidden()
    await page.getByTestId('hint').click()
    await expect(page.getByTestId('drawer')).toContainText(hello.theory!.title)
    await expect(page.getByTestId('drawer')).not.toContainText('Course map')
    expect([await world.boundingBox(), await page.locator('.proto-editor').boundingBox()]).toEqual(before)
    await shot('12-help-drawer')
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('drawer')).toBeHidden()
  })

  await test.step('a narrow window stacks the scene over the editor and keeps Run in the nav', async () => {
    await page.setViewportSize({ width: 390, height: 780 })
    await page.getByRole('button', { name: 'Jump to lesson 1' }).click()
    await expect(code).toBeFocused()
    const scene = (await world.boundingBox())!, editor = (await page.locator('.proto-editor').boundingBox())!
    expect(scene.y + scene.height).toBeLessThanOrEqual(editor.y)
    expect((await run.boundingBox())!.y).toBeLessThan(scene.y)
    await expect(page.getByTestId('checks')).toBeInViewport()
    await shot('13-narrow-idle')
    await page.keyboard.type('Hi there')
    await page.keyboard.press('Control+Enter')
    await expect(card).toBeVisible()
    await expect(card).toBeInViewport({ ratio: 1 })
    await shot('14-narrow-solved')
  })

  expect(await page.evaluate(() => localStorage.getItem('inherit.pack.beginner'))).toBeNull()
  expect(errors).toEqual([])
})
