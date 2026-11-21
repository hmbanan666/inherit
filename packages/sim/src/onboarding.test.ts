import { expect, test } from 'vitest'
import { advanceGame, apiReference, createCampaign, loadSave, onboardingStep, serializeSave } from './index'

test('Bram follows the draft, the first printed tick, and what happens on the floor', () => {
  const c = createCampaign()
  const examples = () => apiReference(c).map(entry => entry.example)
  expect(examples().join('\n')).not.toMatch(/Factory|ctx\.|mine\.|furnace\./)
  expect(onboardingStep(c)).toBe(1)
  expect(onboardingStep(c, true)).toBe(2)
  c.progress.signals.printedTick = true
  expect(onboardingStep(loadSave(serializeSave(c)))).toBe(3)
  expect(examples()).toContain('mine.dig()')
  expect(examples()).not.toContain('mine.connect(furnace)')
  advanceGame(c, ctx => ctx.dig('mine'))
  expect(onboardingStep(c)).toBe(4)
  expect(examples()).toContain('mine.connect(furnace)')
  expect(examples()).not.toContain('furnace.smelt()')
  advanceGame(c, ctx => ctx.connect('mine', 'furnace'))
  expect(onboardingStep(c)).toBe(5)
  expect(examples()).toContain('furnace.smelt()')
  expect(examples()).not.toContain('furnace.connect(cart)')
  for (let i = 0; i < 8; i++) advanceGame(c, ctx => {
    ctx.dig('mine')
    ctx.work('furnace')
  })
  expect(onboardingStep(c)).toBe(6)
  expect(examples()).toContain('furnace.connect(cart)')
  advanceGame(c, ctx => ctx.connect('furnace', 'cart'))
  expect(onboardingStep(c)).toBe(7)
})

test('a silent deploy still needs a printed tick; an older save keeps its floor progress', () => {
  const c = createCampaign()
  advanceGame(c, ctx => ctx.dig('mine'))
  expect(onboardingStep(c, true)).toBe(2)
  delete c.progress.signals.printedTick
  expect(onboardingStep(loadSave(serializeSave(c)))).toBe(4)
})
