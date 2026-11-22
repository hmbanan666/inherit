import { expect, test } from '@playwright/test'
import { chapterCapture } from '../../../../../tests/e2e/chapter-capture'
import { pasteProjectFile } from '../../../../../tests/e2e/workshop'
import { lessons, units } from './lessons'

test('play TypeScript from zero from the gate to the fair', async ({ page }) => {
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  await page.goto('/')
  await page.getByTestId('pack-beginner').click()
  const capture = await chapterCapture(page)
  const world = page.getByTestId('world')
  const drawer = page.getByTestId('drawer')
  for (const lesson of lessons) {
    await test.step(lesson.id, async () => {
      const path = 'beginner/' + lesson.id + '/'
      const starter = lesson.starter()
      const todo = starter.files['main.ts'].split('\n')[starter.edit.line - 2].trim()
      await expect(page.locator('.view-lines')).toContainText(todo)
      await expect(drawer).toBeVisible()
      await expect(drawer).toContainText(lesson.theory.body[0])
      await expect(drawer).toContainText(lesson.theory.example)
      if (lesson.prediction) {
        await drawer.getByText(lesson.prediction.answer, { exact: true }).click()
      }
      await capture(path + 'learn')
      await drawer.getByRole('button', { name: /got it/i }).click()
      await expect(drawer).toBeHidden()
      await expect(world).toContainText(lesson.task.condition)
      await capture(path + 'start')
      await pasteProjectFile(page, lesson.referenceSolution['main.ts'], 'Player TypeScript')
      await page.getByTestId('primary-button').click()
      await expect(world.getByTestId('solved-card')).toBeVisible({ timeout: 15_000 })
      await expect(world.getByTestId(lesson.visibleEffect.testId)).toContainText(lesson.visibleEffect.text)
      await capture(path + 'solved')
      await world.getByTestId('continue').click()
    })
  }
  await expect(page.getByText('Pack complete', { exact: true })).toBeVisible()
  await expect(world.getByTestId('fair')).toHaveAccessibleName('Fair open')
  await expect(world.getByRole('list', {name: 'Village landmarks'}).getByRole('listitem')).toHaveCount(units.length)
  const finish = page.getByRole('region', {name: 'TypeScript from zero'})
  const learned = finish.getByRole('list', {name: 'What you learned'})
  await expect(learned.getByRole('listitem')).toHaveText(lessons.map(lesson => lesson.idea))
  await capture('beginner/complete')

  await expect(world.getByTestId('lamp-5')).toHaveAccessibleName('Lamp 5 lit')
  await page.getByRole('banner').getByRole('link', {name: 'Next pack →'}).click()
  await expect(page.getByTestId('task-card')).toContainText('Lift a rock from the mine')
  await page.getByRole('button', {name: 'Got it'}).click()
  await pasteProjectFile(page, '// My workshop draft', 'Factory controller TypeScript')
  await page.getByTestId('pack-switcher').click()
  await page.getByRole('link', {name: 'TypeScript from zero'}).click()
  const replay = finish.getByRole('button', {name: 'Replay this pack', exact: true})
  const dialog = page.getByRole('dialog')
  await replay.click()
  await capture('beginner/confirm-replay')
  await dialog.getByRole('button', {name: 'Keep my progress'}).click()
  await expect(world.getByTestId('fair')).toHaveAccessibleName('Fair open')
  await replay.click()
  await dialog.getByRole('button', {name: 'Replay this pack'}).click()
  await expect(page.getByTestId('task-card')).toContainText('Give Mila a greeting')
  await page.reload()
  await expect(page.getByTestId('task-card')).toContainText('Give Mila a greeting')
  await page.getByTestId('pack-switcher').click()
  await page.getByRole('link', {name: 'Uncle’s Workshop'}).click()
  await expect(page.locator('.view-lines')).toContainText('// My workshop draft')
  expect(errors).toEqual([])
})
