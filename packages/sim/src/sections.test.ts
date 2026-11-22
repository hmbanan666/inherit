import { expect, test } from 'vitest'
import {
  advanceGame,
  continueStep,
  createCampaign,
  currentStep,
  getSurface,
  jumpToStep,
  loadSave,
  markMessageRead,
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

test('Bram pays once and one Continue releases everything and opens the bank lesson', () => {
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
    { kind: 'letter', id: 'tab' },
    { kind: 'debt' },
  ]
  const before = serializeSave(c)
  const next = continueStep(c)
  expect(serializeSave(c)).toBe(before)
  c = loadSave(serializeSave(next))
  expect(revealed(c)).toEqual(expected)
  expect(c.lesson.queue).toEqual([])
  expect(c.progress.messages.filter(m => m.id === 'tab')).toHaveLength(1)
  expect(currentStep(c)).toMatchObject({ step: { id: 'harrow-tab' }, phase: 'brief' })
})

test('Bram pays for three more ingots only after his order has been shown and filled', () => {
  let c = jumpToStep(createCampaign(), 'harrow-tab')
  markMessageRead(c, 'tab')
  c.town.waiting['iron-ingot'] = 2
  advanceGame(c)
  expect(c.economy.money).toBe(64)
  expect(currentStep(c)?.step.solved.idea).toContain('12 coins for three more ingots')
  expect(c.economy.orders).toHaveLength(0)

  c = continueStep(c)
  advanceGame(c)
  expect(c.economy.orders).toMatchObject([{ customer: 'bram', items: { 'iron-ingot': 3 }, filled: { 'iron-ingot': 2 }, pay: 12 }])
  expect(c.economy.money).toBe(64)
  c.town.waiting['iron-ingot'] = 1
  advanceGame(c)
  expect(c.economy.money).toBe(76)
  c.town.waiting['iron-ingot'] = 3
  advanceGame(c)
  expect(c.economy.money).toBe(76)
  expect(c.economy.orders).toHaveLength(0)
})
