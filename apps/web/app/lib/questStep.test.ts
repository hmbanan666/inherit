import { expect, test } from 'vitest'
import { grantHint, grantNote, questNextStep, type CartCue, type QuestStepState } from './questStep'

const empty = { input: 0, coal: 0, output: 0, steel: 0 }
const none = { ingots: 0, steel: 0 }

function state(patch: Partial<QuestStepState> = {}): QuestStepState {
  return { ready: false, shipped: 0, loop: false, furnace: empty, made: none, ...patch }
}

test('the card names who to talk to, the quest to take, and the hand-over', () => {
  expect(questNextStep(state({ available: { from: 'Ines' } }))).toBe('Talk to Ines')
  expect(questNextStep(state({ reading: { from: 'Bram' }, available: { from: 'Bram' } }))).toBe("Take Bram's quest")
  expect(questNextStep(state({ reading: { from: 'Mayor Odile' } }))).toBe("Take Odile's quest")
  expect(questNextStep(state())).toBe('More is coming.')
  const ines = { from: 'Ines', goal: 'Bring Ines 16 ingots.', item: 'ingot' as const, qty: 16, trigger: 'tick' as const }
  expect(questNextStep(state({ quest: ines, ready: true, shipped: 16 }))).toBe('Hand over 16 ingots')
  expect(questNextStep(state({
    quest: { from: 'Mayor Odile', goal: 'Bring Odile 4 steel.', item: 'steel', qty: 4 },
    ready: true, shipped: 4,
  }))).toBe('Hand over 4 steel')
})

test('an open quest says what to press, what to carry, or the bring line', () => {
  const bram = { from: 'Bram', goal: 'Bring Bram 2 ingots.', item: 'ingot' as const, qty: 2, trigger: 'run' as const }
  expect(questNextStep(state({ quest: bram, runName: 'smeltOnce' }))).toBe('Bring Bram 2 ingots.')
  expect(questNextStep(state({ quest: bram, runName: 'smeltOnce', triggerReady: true }))).toBe('Press ▶ next to smeltOnce')
  expect(questNextStep(state({ quest: bram, furnace: { ...empty, output: 2 } }))).toBe('Carry the ingots to the depot.')
  expect(questNextStep(state({ quest: bram, furnace: { ...empty, output: 2, steel: 1 } }))).toBe('Carry the ingots to the depot.')
  expect(questNextStep(state({ quest: bram, furnace: { ...empty, steel: 1 } }))).toBe('Bring Bram 2 ingots.')
  expect(questNextStep(state({ quest: bram, furnace: { ...empty, input: 2 } }))).toBe('Open the furnace and choose Smelt.')
  const ines = { from: 'Ines', goal: 'Bring Ines 16 ingots.', item: 'ingot' as const, qty: 16, trigger: 'tick' as const }
  expect(questNextStep(state({ quest: ines }))).toBe('Bring Ines 16 ingots.')
  expect(questNextStep(state({ quest: ines, triggerReady: true }))).toBe('Turn on Loop: onTick')
  expect(questNextStep(state({ quest: ines, loop: true, triggerReady: true }))).toBe('Bring Ines 16 ingots.')
  const elsie = { from: 'Elsie', goal: 'Bring Elsie 6 steel.', item: 'steel' as const, qty: 6, trigger: 'events' as const }
  expect(questNextStep(state({ quest: elsie }))).toBe('Bring Elsie 6 steel.')
  expect(questNextStep(state({ quest: elsie, triggerReady: true }))).toBe('on() runs a function when the works change.')
  expect(questNextStep(state({ quest: elsie, furnace: { ...empty, steel: 1 } }))).toBe('Carry the steel to the depot.')
})

test('a granted trigger adds one line', () => {
  expect(grantHint('run')).toBe('Press ▶ next to a function. It runs once, this tick.')
  expect(grantHint('tick')).toBe('Loop calls that function every tick.')
  expect(grantHint('events')).toBe('on() runs a function when the works change.')
  expect(grantHint(undefined)).toBeUndefined()
})

test('the card follows the cart until the task changes', () => {
  const bram = { from: 'Bram', goal: 'Bring Bram 2 ingots.', item: 'ingot' as const, qty: 2, trigger: 'run' as const }
  const cart: CartCue = { name: 'drone-1', cargo: 0, capacity: 3, carrying: null }
  expect(questNextStep(state({
    quest: bram,
    cart: { ...cart, task: 'mine', vein: 'A' },
  }))).toBe('drone-1 is mining Vein A. When the cart is full, open drone-1 and choose Unload.')
  expect(questNextStep(state({
    quest: bram,
    cart: { ...cart, cargo: 3, capacity: 3, carrying: 'ore', task: null },
  }))).toBe('Open drone-1 and choose Unload.')
  expect(questNextStep(state({
    quest: bram,
    cart: { ...cart, cargo: 3, carrying: 'ore', task: 'unload', at: 'furnace' },
  }))).toBe('drone-1 is carrying ore to the furnace. Open the furnace and choose Smelt once the hopper has enough ore.')
  expect(questNextStep(state({
    quest: bram,
    cart: { ...cart, cargo: 2, carrying: 'ingot', task: 'pickup', phase: 'deliver' },
  }))).toBe('drone-1 is carrying ingots to the depot.')
  expect(questNextStep(state({ quest: bram, smelting: true, furnace: { ...empty, input: 2 } }))).toBe('The furnace is smelting.')
  const odile = { from: 'Mayor Odile', goal: 'Bring Odile 4 steel.', item: 'steel' as const, qty: 4 }
  expect(questNextStep(state({
    quest: odile,
    furnace: { ...empty, input: 2, coal: 1 },
  }))).toBe('Open the furnace and choose Alloy.')
})

test('a lit Loop says whether onTick is deployed', () => {
  expect(grantNote('tick', { on: true, deployed: false, draft: true })).toEqual({ text: 'Loop is on. Deploy main.ts to start onTick' })
  expect(grantNote('tick', { on: true, deployed: false, draft: false, helper: 'lib/haul.ts' })).toEqual({
    text: 'Export onTick from main.ts', file: 'lib/haul.ts',
  })
  expect(grantNote('tick', { on: true, deployed: true, draft: false })).toEqual({ text: 'Loop calls that function every tick.' })
  expect(grantNote('tick', { on: false, deployed: false, draft: true })).toEqual({ text: 'Loop calls that function every tick.' })
  expect(grantNote('run')).toEqual({ text: 'Press ▶ next to a function. It runs once, this tick.' })
})
