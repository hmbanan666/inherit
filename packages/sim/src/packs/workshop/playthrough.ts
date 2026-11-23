import { expect, test } from '@playwright/test'
import { chapterCapture } from '../../../../../tests/e2e/chapter-capture'
import { openTool, pasteProjectFile } from '../../../../../tests/e2e/workshop'
import { lessons } from './lessons'

test('Workshop plays twelve parcel challenges from the showcase to the finish', async ({ page }) => {
  test.setTimeout(180_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const capture = await chapterCapture(page)
  await page.goto('/?speed=8')
  await page.getByTestId('pack-workshop').click()
  const primary = page.getByTestId('primary-button')
  for (const lesson of lessons) await test.step(lesson.id, async () => {
    const path = 'workshop/' + lesson.id + '/'
    await expect(page.getByTestId('task-card')).toContainText(lesson.goal)
    const learn = page.getByTestId('drawer')
    await openTool(page, 'learn')
    await expect(learn).toContainText(lesson.task.condition)
    if (lesson.mode === 'deploy') await expect(learn.getByRole('list', { name: 'The floor clock' })).toBeVisible()
    await expect(page.locator('.view-lines')).toContainText(lesson.starter().files['main.ts'].split('\n')[0])
    await capture(path + 'learn')
    await learn.getByRole('button', { name: 'Got it' }).click()
    await capture(path + 'start')
    await pasteProjectFile(page, lesson.referenceSolution['main.ts'], 'Player TypeScript')
    await primary.click()
    if (lesson.mode === 'deploy') {
      await expect(primary).toContainText('Deploy')
      await primary.click()
      await expect(primary).toContainText('Stop loop')
    } else {
      await expect(primary).toBeDisabled()
    }
    await capture(path + 'running')
    await expect(page.getByTestId('solved-card')).toContainText(lesson.solved.did, { timeout: 15000 })
    await expect(page.getByTestId(lesson.visibleEffect.testId)).toContainText(lesson.visibleEffect.text)
    await capture(path + 'solved')
    await page.getByTestId('continue').click()
  })
  await expect(page.getByText('Pack complete', { exact: true })).toBeVisible()
  await capture('workshop/finished')
  const completed = await page.evaluate(() => JSON.parse(localStorage.getItem('inherit.pack.workshop')!).completed)
  expect(completed).toEqual(lessons.map(lesson => lesson.id))
  expect(errors).toEqual([])
})

for (const rate of [1, 2, 4]) test('direct clock entry, pause and parcel delivery at ' + rate + 'x', async ({ page }) => {
  await page.goto('/?pack=workshop')
  const primary = page.getByTestId('primary-button')
  const drawer = page.getByTestId('drawer')
  await page.getByTestId('progress-chip').click()
  await page.getByRole('navigation', { name: 'Challenge picker' }).getByRole('button', { name: /Dispatch on the clock/ }).click()
  await expect(page.getByTestId('task-card')).toContainText('Dispatch on the clock')
  await expect(primary).toBeEnabled()
  await openTool(page, 'learn')
  await expect(drawer).toContainText('Who calls my function?')
  await drawer.getByTestId('drawer-api').click()
  await expect(drawer).toContainText('onTick(): void')
  await expect(drawer).toContainText('const lifted = take("belt")')
  await drawer.getByRole('button', { name: 'Close drawer', exact: true }).click()
  const clock = lessons.find(l => l.id === 'first-clock')!
  await pasteProjectFile(page, clock.referenceSolution['main.ts'], 'Player TypeScript')
  await primary.click()
  await expect(primary).toContainText('Deploy')
  await primary.click()
  const bar = page.getByRole('group', { name: 'Clock controls' })
  await bar.getByRole('button', { name: rate + 'x', exact: true }).click()
  await page.waitForFunction(() => {
    const arm = document.querySelector('.plan foreignObject')
    const x = Number(arm?.getAttribute('x'))
    if (x <= 20 || x >= 506) return false
    const pause = [...document.querySelectorAll<HTMLButtonElement>('.playback-bar button')].find(b => b.textContent === 'Pause')
    pause?.click()
    return !!pause
  }, undefined, { timeout: 10000 })
  const counter = await bar.locator('output').innerText()
  const position = await page.locator('.plan foreignObject').getAttribute('x')
  await page.waitForTimeout(1000)
  await expect(bar.locator('output')).toHaveText(counter)
  await expect(page.locator('.plan foreignObject')).toHaveAttribute('x', position!)
  await bar.getByRole('button', { name: 'Play', exact: true }).click()
  await expect(page.getByTestId('solved-card')).toBeVisible({ timeout: 12000 })
  await expect(bar.locator('output')).toHaveText('onTick #6')
  await expect(page.getByTestId('result-cart')).toHaveText('A B C')
})

test('Stop loop retains the floor and Run once inspects a disposable tick', async ({ page }) => {
  await page.goto('/?pack=workshop')
  await page.getByTestId('progress-chip').click()
  await page.getByRole('navigation', { name: 'Challenge picker' }).getByRole('button', { name: /Dispatch on the clock/ }).click()
  await expect(page.getByTestId('task-card')).toContainText('Dispatch on the clock')
  await pasteProjectFile(page, lessons.find(l => l.id === 'first-clock')!.referenceSolution['main.ts'], 'Player TypeScript')
  const primary = page.getByTestId('primary-button')
  await primary.click()
  await expect(primary).toContainText('Deploy')
  await primary.click()
  await expect(primary).toContainText('Stop loop')
  await page.waitForFunction(() => {
    const x = Number(document.querySelector('.plan foreignObject')?.getAttribute('x'))
    if (x <= 20 || x >= 506) return false
    document.querySelector<HTMLButtonElement>('[data-testid="primary-button"]')!.click()
    return true
  })
  await expect(primary).toContainText('Deploy')
  const before = (await page.getByTestId('result-cart').textContent())!
  await page.getByRole('button', { name: 'Run once', exact: true }).click()
  await expect(page.getByTestId('result-cart')).toHaveText('A')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('inherit.pack.workshop')!).world.queues.cart)).toEqual([])
  await page.getByRole('button', { name: 'Return to paused floor' }).click()
  await expect(page.getByTestId('result-cart')).toHaveText(before)
})

test('a v5 save starts fresh and its original files open in Settings', async ({ page }) => {
  const source = JSON.stringify({
    formatVersion: 1, packId: 'workshop', packVersion: 1,
    world: { version: 6 }, entryWorld: { version: 6 },
    project: { working: { 'main.ts': '// old working file' }, deployed: null, history: [], snapshots: [] },
  })
  await page.goto('/')
  await page.evaluate(raw => localStorage.setItem('inherit.pack.workshop', raw), source)
  await page.getByTestId('pack-workshop').click()
  await expect(page.getByTestId('task-card')).toHaveText(/Dispatch the waiting batch/)
  await page.getByRole('button', { name: 'Settings' }).click()
  await page.getByText('v5 Workshop code', { exact: true }).click()
  await expect(page.locator('.hud-menu pre')).toContainText('// old working file')
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download original save' }).click()
  expect((await download).suggestedFilename()).toBe('workshop-save.json')
})

test('challenge selection preserves working drafts and starts each floor fresh', async ({ page }) => {
  await page.goto('/?pack=workshop')
  await pasteProjectFile(page, '// my unfinished batch', 'Player TypeScript')
  await page.getByTestId('progress-chip').click()
  const picker = page.getByRole('navigation', { name: 'Challenge picker' })
  await picker.getByRole('button', { name: /Merge two sorted bins/ }).click()
  await expect(page.getByTestId('result-left')).toHaveText('A C')
  await page.getByTestId('progress-chip').click()
  await picker.getByRole('button', { name: /Dispatch the waiting batch/ }).click()
  await expect(page.locator('.view-lines')).toContainText('// my unfinished batch')
  await expect(page.getByTestId('result-belt')).toHaveText('A B C')
  await page.reload()
  await expect(page.locator('.view-lines')).toContainText('// my unfinished batch')
})
