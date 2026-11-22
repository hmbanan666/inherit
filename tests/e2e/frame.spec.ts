import { test, expect } from '@playwright/test'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chapterCapture } from './chapter-capture'
import { openTool } from './workshop'

for (const [width, height] of [[1440, 900], [1280, 720], [390, 844]]) {
  test('drawer tabs keep both panes in place at ' + width, async ({ page }) => {
    await page.setViewportSize({width, height})
    await page.goto('/?pack=beginner&lesson=hello')
    const drawer = page.getByTestId('drawer')
    await expect(drawer).toContainText('A call and a string')
    await expect(page.locator('.view-lines')).toBeVisible()
    await drawer.getByRole('button', {name: 'Got it'}).click()
    const bounds = () => Promise.all([
      page.getByTestId('world').boundingBox(),
      page.locator('.village-scene').boundingBox(),
      page.locator('.editor-host').boundingBox(),
    ])
    const closed = await bounds()
    for (const tab of ['learn', 'hints', 'api', 'console'] as const) {
      await openTool(page, tab)
      expect(await bounds()).toEqual(closed)
      if (tab === 'api') {
        await expect(drawer).toContainText('say(words: string): void')
        await expect(drawer).toContainText('Your words, up to 80 characters.')
        await expect(drawer).toContainText('Returns No value.')
        await expect(drawer).toContainText('say("Good morning!")')
        if (width === 1440) await (await chapterCapture(page))('beginner/hello/api')
      }
    }
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(page.getByTestId('hint')).toBeFocused()
    expect(await bounds()).toEqual(closed)
  })
}

test('Enter advances once and review restores the forward draft after reload', async ({ page }) => {
  await page.emulateMedia({reducedMotion: 'reduce'})
  await page.goto('/?pack=beginner')
  const drawer = page.getByTestId('drawer')
  const editor = page.getByRole('textbox', {name: 'Player TypeScript'})
  await drawer.getByRole('button', {name: 'Got it'}).click()
  await editor.focus()
  await page.keyboard.insertText('say("Hello!")')
  await page.getByTestId('primary-button').click()
  await expect(drawer).toBeHidden()
  const next = page.getByTestId('continue')
  await expect(next).toBeFocused()
  const card = (await page.getByTestId('solved-card').boundingBox())!
  const world = (await page.getByTestId('world').boundingBox())!
  expect(Math.abs(card.x + card.width / 2 - world.x - world.width / 2)).toBeLessThan(2)
  expect(Math.abs(card.y + card.height / 2 - world.y - world.height / 2)).toBeLessThan(2)
  await expect(page.locator('.confetti')).toBeHidden()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('task-card')).toContainText('Print the two-word ferry name')
  await drawer.getByRole('button', {name: 'Got it'}).click()
  await page.keyboard.insertText('// keep my ferry sign')
  await openTool(page, 'learn')
  const map = drawer.getByRole('navigation', {name: 'Course map'})
  await expect(map.getByRole('button', {name: /two station calls/})).toBeDisabled()
  await map.getByRole('button', {name: /Give Mila a greeting/}).click()
  await expect(page.locator('.view-lines')).toContainText('say("Hello!")')
  await page.reload()
  await expect(page.getByTestId('task-card')).toContainText('Give Mila a greeting')
  await page.getByTestId('primary-button').click()
  await expect(next).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.view-lines')).toContainText('// keep my ferry sign')
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
})

for (const [pack, lesson] of [['beginner','hello'], ['workshop','bram-take']]) {
  test(pack + ' production preview leaves storage untouched on edit, Continue and reload', async ({page}) => {
    const data = { ['inherit.pack.' + pack]: 'original player bytes' }
    await page.addInitScript(data => {
      for (const [key, raw] of Object.entries(data)) localStorage.setItem(key, raw)
    }, data)
    await page.goto('/?pack=' + pack + '&lesson=' + lesson)
    const editor = page.getByRole('textbox', {name: /TypeScript/})
    await expect(editor).toBeVisible()
    await expect(page.getByTestId('primary-button')).toBeEnabled()
    await page.getByRole('button', {name: 'Got it'}).click()
    await editor.focus()
    await page.keyboard.insertText(pack === 'beginner' ? 'say("Hello!")' : 'take("mine")')
    await page.getByTestId('primary-button').click()
    await page.getByTestId('continue').click()
    await expect(page.getByTestId('task-card')).toContainText(pack === 'beginner' ? 'two-word ferry name' : 'in the furnace')
    await page.reload()
    await expect(page.getByTestId('task-card')).toContainText(pack === 'beginner' ? 'Give Mila a greeting' : 'Lift a rock')
    expect(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage)))).toEqual(data)
  })
}

test('shots captures the supplied preview and a matching transcript', async ({baseURL}) => {
  const dir = await mkdtemp(join(tmpdir(), 'inherit-shots-smoke-'))
  try {
    await promisify(execFile)('node', ['scripts/shots.mjs', '--url', baseURL!, '--pack', 'beginner', '--lesson', 'flowers'], {
      env: {...process.env, INHERIT_SHOTS: dir},
    })
    const frame = join(dir, 'beginner', 'flowers', 'start')
    expect((await readFile(frame + '.png')).subarray(1, 4).toString()).toBe('PNG')
    expect(await readFile(frame + '.txt', 'utf8')).toContain('Number values')
  } finally {
    await rm(dir, {recursive: true, force: true})
  }
})

test('a failed Continue keeps the solved boundary available for one retry', async ({page}) => {
  await page.goto('/?pack=beginner')
  await expect(page.locator('.view-lines')).toBeVisible()
  await page.getByRole('button', {name: 'Got it'}).click()
  await page.keyboard.insertText('say("Hello!")')
  await page.getByTestId('primary-button').click()
  const next = page.getByTestId('continue')
  await expect(next).toBeFocused()
  await page.evaluate(() => {
    const write = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'inherit.pack.beginner' && JSON.parse(value).lessonId === 'sign-spaces') {
        Storage.prototype.setItem = write
        throw new DOMException('Storage full', 'QuotaExceededError')
      }
      return write.call(this, key, value)
    }
  })
  await next.click()
  await expect(page.getByRole('alert').filter({hasText: 'Could not save progress'})).toBeVisible()
  await expect(next).toBeEnabled()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('inherit.pack.beginner')!))).toMatchObject({
    lessonId: 'hello', phase: 'solved', completed: [],
  })
  await next.click()
  await expect(page.getByTestId('task-card')).toContainText('two-word ferry name')
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
})

test('medal checks list both failed podium inputs in the same row', async ({page}) => {
  await page.goto('/?pack=beginner&lesson=podium')
  await page.getByRole('button', {name: 'Got it'}).click()
  const editor = page.getByRole('textbox', {name: 'Player TypeScript'})
  await editor.focus()
  await page.keyboard.press('Control+a')
  await page.keyboard.insertText([
    'if (position === 1) {',
    '  paintSign("silver")',
    '} else if (position === 2) {',
    '  paintSign("silver")',
    '} else {',
    '  paintSign("silver")',
    '}',
  ].join('\n'))
  await page.getByTestId('primary-button').click()
  const checks = page.getByTestId('checks')
  await checks.getByRole('button', {name: '1 done'}).click()
  await expect(checks.getByRole('listitem')).toHaveCount(2)
  const failed = checks.locator('[data-state="red"]')
  await expect(failed).toHaveCount(1)
  await expect(failed).toContainText('First place, Third place')
  await expect(failed).toContainText('First and third show gold and bronze')
  await expect(page.getByTestId('signs')).toContainText('silver')
})
