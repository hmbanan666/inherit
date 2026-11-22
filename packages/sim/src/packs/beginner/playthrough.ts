import { expect, test } from '@playwright/test'
import { chapterCapture } from '../../../../../tests/e2e/chapter-capture'
import { pasteProjectFile } from '../../../../../tests/e2e/workshop'
import { lessons } from './lessons'

test('play TypeScript from zero from the gate to the fair', async ({ page }) => {
  test.setTimeout(600_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
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
      await expect(world.getByTestId('solved-card')).toBeVisible()
      await expect(world.getByTestId(lesson.visibleEffect.testId)).toContainText(lesson.visibleEffect.text)
      await capture(path + 'solved')
      await world.getByTestId('continue').click()
    })
  }
  await expect(page.getByText('Pack complete', { exact: true })).toBeVisible()
  await expect(world.getByTestId('fair')).toHaveAccessibleName('Fair open')
  await capture('beginner/complete')
  expect(errors).toEqual([])
})
