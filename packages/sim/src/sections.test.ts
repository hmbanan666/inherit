import { expect, test } from 'vitest'
import {
  advanceGame,
  continueStep,
  createCampaign,
  currentStep,
  getSurface,
  jumpToStep,
  loadSave,
  revealed,
  serializeSave,
} from './index'

test('floor activity cannot open a section or dismiss a solved card', () => {
  const c = jumpToStep(createCampaign(), 'bram-feed')
  for (let i = 0; i < 50; i++) advanceGame(c)
  expect(currentStep(c)?.phase).toBe('brief')
  expect(getSurface(c)).toMatchObject({ sections: ['factory'], showMoney: false })
  expect(c.world.hand?.origin).toBe('mine')
})

test('Bram pays once and each Continue releases one saved reveal', () => {
  let c = jumpToStep(createCampaign(), 'bram-loop')
  c.lesson.phase = 'working'
  c.town.wired = true
  for (let i = 0; i < 400; i++)
    advanceGame(c, (arm) => {
      arm.take('mine')
      arm.put('furnace')
      arm.take('furnace')
      arm.put('cart')
    })
  expect(c.economy.money).toBe(64)
  expect(currentStep(c)).toMatchObject({ step: { id: 'bram-loop' }, phase: 'solved' })
  expect(revealed(c)).toEqual([])
  const expected = [
    { kind: 'coins' },
    { kind: 'section', id: 'town' },
    { kind: 'section', id: 'inbox' },
    { kind: 'letter', id: 'tab' },
    { kind: 'debt' },
  ]
  for (let i = 0; i < expected.length; i++) {
    const before = serializeSave(c)
    const next = continueStep(c)
    expect(serializeSave(c)).toBe(before)
    c = loadSave(serializeSave(next))
    expect(revealed(c)).toEqual(expected.slice(0, i + 1))
    expect(c.progress.messages.some((m) => m.id === 'tab')).toBe(i >= 3)
  }
  expect(currentStep(c)).toMatchObject({ step: { id: 'harrow-tab' }, phase: 'brief' })
})
