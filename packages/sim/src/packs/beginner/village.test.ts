import { expect, test } from 'vitest'
import { freshSave } from '../../framework/save'
import { runPack } from '../../../../sandbox/src/pack-run'
import pack from './pack'
import { lessons } from './lessons'
import { propText } from './world'

test('any nonblank greeting makes Mila wave and carries the player’s own words', async () => {
  const save = freshSave(pack)
  await runPack(pack, save, { 'main.ts': 'say("Howdy, friend!")' })
  expect(save.phase).toBe('solved')
  expect(save.world.bubble).toBe('Howdy, friend!')
})

test('unknown names, unmatched quotes and brackets point back to the draft', async () => {
  for (const [source, message] of [
    ['sya("Hi")', 'Did you mean “say”'],
    ['say("Hello!)', 'matching quote'],
    ['say("Hi"', 'closing )'],
  ]) {
    await expect(runPack(pack, freshSave(pack), { 'main.ts': source })).rejects.toThrow(message)
  }
})

test('the cottage remembers the player’s lettering after changing scenes', async () => {
  const save = freshSave(pack)
  const sign = lessons.find(lesson => lesson.id === 'house-sign')!
  sign.enter(save.entryWorld)
  save.lessonId = sign.id
  await runPack(pack, save, { 'main.ts': 'const home = "Fox Hollow"\npaintSign(home)' })
  expect(save.phase).toBe('solved')
  const next = lessons.find(lesson => lesson.id === 'flag')!
  next.enter(save.world)
  expect(save.world.album['house-sign']).toBe('Fox Hollow')
  expect(propText(save.world, 'flag')).toBe('blue')
})

test('unrelated syntax does not earn credit for a hard-coded scene result', async () => {
  for (const [id, source] of [
    ['apple-basket', 'const unused = 2 + 3\nfillBasket(5)'],
    ['house-sign', 'function unused() { const sign = "Mila"; paintSign(sign) }\npaintSign("Mila")'],
    ['ticket-type', 'const unused: string = "Cove"\npaintSign("Cove")'],
    ['path-lamps', 'for (let n = 1; n <= 5; n++) {}\nlightLamp(1)\nlightLamp(2)\nlightLamp(3)\nlightLamp(4)\nlightLamp(5)'],
  ]) {
    const lesson = lessons.find(item => item.id === id)!
    const save = freshSave(pack)
    save.lessonId = id
    lesson.enter(save.entryWorld)
    await runPack(pack, save, { 'main.ts': source })
    expect(save.phase, id).toBe('working')
  }
})
