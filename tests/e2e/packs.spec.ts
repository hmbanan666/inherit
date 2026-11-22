import { expect, test } from '@playwright/test'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Lesson } from '../../packages/sim/src/framework/pack'
import { chapterCapture } from './chapter-capture'
import { pasteProjectFile } from './workshop'

const root = resolve('packages/sim/src/packs')
// Specialized studios exercise their own visible panels in a continuous playthrough.
for (const entry of readdirSync(root,{withFileTypes:true}).filter(e=>e.isDirectory() && !e.name.startsWith('.'))) {
  const folder = resolve(root,entry.name)
  if (existsSync(resolve(folder,'playthrough.ts'))) {
    require(resolve(folder,'playthrough.ts'))
    continue
  }
  const {lessons} = require(resolve(folder,'lessons.ts')) as {lessons:Lesson<unknown>[]}
  test(entry.name+' plays every reference from its showcase card',async({page})=>{
    test.setTimeout(150000)
    const errors: string[] = []
    page.on('pageerror',error=>errors.push(error.message))
    page.on('console',message=>{if (message.type()==='error') errors.push(message.text())})
    const capture = await chapterCapture(page)
    await page.goto('/')
    const featured = page.getByTestId('pack-beginner')
    await expect(featured).toContainText('Start here')
    if (entry.name==='beginner') await capture('showcase')
    await page.getByTestId('pack-'+entry.name).click()
    const primary = page.getByTestId('primary-button'), world = page.getByTestId('world')
    await expect(page.locator('.view-lines')).toBeVisible()
    await expect(world).toBeInViewport()
    const action = (await primary.boundingBox())!
    expect(action.width).toBeGreaterThanOrEqual(128)
    expect(action.height).toBeGreaterThanOrEqual(44)
    expect(action.x+action.width).toBeGreaterThan(1400)
    await page.getByTestId('pack-switcher').click()
    await expect(page.getByRole('navigation',{name:'Switch pack'})).toBeVisible()
    if (entry.name==='beginner') await capture('pack-switcher')
    await page.getByTestId('pack-switcher').click()
    for (const lesson of lessons) await test.step(lesson.id,async()=>{
      const path = entry.name+'/'+lesson.id+'/'
      const goal = page.getByTestId('task-card').getByRole('heading')
      await expect(goal).toHaveText(lesson.goal)
      const starter = lesson.starter({})
      const comment = starter.files[starter.edit.file].split('\n')[starter.edit.line-2].trim()
      await expect(page.locator('.view-lines')).toContainText(comment)
      await expect(world).toBeVisible()
      if (entry.name==='beginner') await expect(page.locator('body')).not.toContainText(/coins|debt|inbox|orders/i)
      await capture(path+'start')
      for (const [file,source] of Object.entries(lesson.referenceSolution)) {
        if (Object.keys(lesson.referenceSolution).length > 1) {
          await page.getByTestId('hint').click()
          await page.getByTestId('drawer').getByRole('button', {name: file, exact: true}).click()
        }
        await pasteProjectFile(page,source,'Player TypeScript')
      }
      await primary.click()
      await expect(primary).toBeDisabled()
      await expect(primary).toHaveText(/Playing your run/)
      await expect(page.locator('.machine-line')).toBeVisible()
      if (lesson.id==='path-lamps' && entry.name==='beginner') {
        await expect(world.getByTestId('lamp-3')).toHaveAccessibleName('Lamp 3 lit')
        await expect(world.getByTestId('lamp-5')).toHaveAccessibleName('Lamp 5 unlit')
      }
      await capture(path+'watched')
      const effect = world.getByTestId(lesson.visibleEffect.testId)
      await expect(effect).toBeVisible()
      await expect.poll(async()=>[await effect.getAttribute('aria-label'),await effect.textContent()].join(' ')).toContain(lesson.visibleEffect.text)
      await expect(world.getByTestId('solved-card')).toContainText(lesson.solved.did)
      await expect(page.getByTestId('checks').locator('.done-count')).toHaveAttribute('aria-expanded','false')
      await capture(path+'solved')
      await expect(goal).toHaveText(lesson.goal)
      await world.getByTestId('continue').click()
    })
    await expect(page.getByText('Pack complete',{exact:true})).toBeVisible()
    const learned = page.getByRole('list', {name: 'What you learned'})
    await expect(learned.getByRole('listitem')).toHaveText(lessons.map(lesson => lesson.idea))
    await capture(entry.name + '/complete')
    expect(errors).toEqual([])
  })
}

test('switching packs and reloading preserves an unfinished village edit',async({page})=>{
  await page.goto('/')
  await page.getByTestId('pack-beginner').click()
  await page.getByRole('button', {name: 'Got it'}).click()
  await pasteProjectFile(page,'// Try my greeting\nsay("Morning!")','Player TypeScript')
  await page.getByTestId('pack-switcher').click()
  await page.getByRole('link',{name:'Workshop'}).click()
  await expect(page.locator('.view-lines')).toContainText('TODO: Write a helper')
  await page.getByTestId('pack-switcher').click()
  await page.getByRole('link',{name:'TypeScript from zero'}).click()
  await page.reload()
  await expect(page.locator('.view-lines')).toContainText('Morning!')
  await expect(page.getByTestId('world')).toBeVisible()
})

test('an unreadable save stays untouched until the player starts a fresh village',async({page})=>{
  await page.goto('/')
  const raw = '{"formatVersion":9,"packId":"beginner"}'
  await page.evaluate(value=>localStorage.setItem('inherit.pack.beginner',value),raw)
  await page.getByTestId('pack-beginner').click()
  await expect(page.getByRole('alert').filter({hasText:'save'})).toBeVisible()
  expect(await page.evaluate(()=>localStorage.getItem('inherit.pack.beginner'))).toBe(raw)
  await page.getByRole('button',{name:'Start a fresh pack'}).click()
  await expect(page.getByTestId('task-card')).toContainText('Give Mila a greeting')
  await page.reload()
  await expect(page.getByTestId('primary-button')).toBeEnabled()
})

test('a beginner can finish the first lesson after reading Learn',async({page})=>{
  const errors: string[] = []
  page.on('pageerror',e=>errors.push(e.message))
  await page.goto('/')
  await page.getByTestId('pack-beginner').click()
  await expect(page.getByRole('group', { name: 'Clock controls' })).toHaveCount(0)
  const editor = page.getByRole('textbox',{name:'Player TypeScript'})
  await page.getByRole('button', {name: 'Got it'}).click()
  await expect(editor).toBeFocused()
  await page.keyboard.type('say("Hello!")')
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('speech')).toHaveAccessibleName('Hello!')
  await page.getByTestId('continue').click()
  await expect(page.getByTestId('task-card')).toContainText('Print the two-word ferry name')
  await page.getByRole('button', {name: 'Got it'}).click()
  await page.keyboard.type('paintSign("Moon Ferry")')
  await expect(page.locator('.view-line').nth(1)).toHaveText('paintSign("Moon Ferry")')
  await page.getByTestId('primary-button').click()
  await expect(page.getByTestId('continue')).toBeVisible()
  expect(errors).toEqual([])
})

test('Continue places the cursor on the first edit line of a multi-step starter', async ({page}) => {
  await page.goto('/?pack=beginner&lesson=flag')
  const editor = page.getByRole('textbox', {name: 'Player TypeScript'})
  await page.getByRole('button', {name: 'Got it'}).click()
  await expect(editor).toBeFocused()
  await page.keyboard.type('flagColour = "gold"')
  await page.getByTestId('primary-button').click()
  await page.getByTestId('continue').click()
  await expect(page.getByTestId('task-card')).toContainText('Keep the printed ticket')
  await page.getByRole('button', {name: 'Got it'}).click()
  await page.keyboard.insertText('let board = ticket')
  await expect(page.locator('.view-line').nth(2)).toHaveText('let board = ticket')
})
