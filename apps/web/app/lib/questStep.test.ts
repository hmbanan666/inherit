import { createWorld, kettlewick, questList } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { nextTick, shallowRef } from 'vue'
import { droneStatusLine, grantHint, grantNote, questNextStep, steadyLine, useDroneStatus, type CartCue, type QuestStepState } from './questStep'

const bram = questList.find(quest => quest.id === 'bram')!
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
  const ines = { from: 'Ines', goal: 'Bring Ines 16 ingots.', item: 'ingot' as const, qty: 16, trigger: 'tick' as const }
  expect(questNextStep(state({ quest: ines }))).toBe('Bring Ines 16 ingots.')
  expect(questNextStep(state({ quest: ines, triggerReady: true }))).toBe('Turn on Loop: onTick')
  expect(questNextStep(state({ quest: ines, loop: true, triggerReady: true }))).toBe('Bring Ines 16 ingots.')
  const elsie = { from: 'Elsie', goal: 'Bring Elsie 6 steel.', item: 'steel' as const, qty: 6, trigger: 'events' as const }
  expect(questNextStep(state({ quest: elsie }))).toBe('Bring Elsie 6 steel.')
  expect(questNextStep(state({ quest: elsie, triggerReady: true }))).toBe('on() runs a function when the works change.')
  expect(questNextStep(state({ quest: elsie, furnace: { ...empty, steel: 1 } }))).toBe('Carry the steel to the depot.')
})

test('Bram needs a loaded hopper and a batch started from the editor', () => {
  const batch = state({ quest: { ...bram, batchCheck: 'open' }, oreNeed: kettlewick.recipe.ore })
  expect(questNextStep(batch)).toBe('Load ore into the furnace.')
  const loaded = { ...batch, furnace: { ...empty, input: kettlewick.recipe.ore, output: 1 } }
  expect(questNextStep(loaded)).toBe('Edit smeltOnce, then press ▶.')
  expect(questNextStep({
    ...batch, furnace: { ...empty, input: kettlewick.furnace.oreMax! },
    cart: { name: 'drone-1', capacity: 3, cargo: 3, carrying: 'ore' },
  })).toBe('Edit smeltOnce, then press ▶.')
  expect(questNextStep({ ...loaded, smelting: true, furnace: { ...empty, input: 2 } })).toBe('The furnace is smelting.')
  const started = { ...bram, batchCheck: 'green' as const }
  expect(questNextStep({ ...batch, quest: started, smelting: true })).toBe('The furnace is smelting.')
  expect(questNextStep({ ...loaded, quest: started })).toBe('Carry the ingots to the depot.')
})

test.each(['ines', 'elsie', 'harrow', 'pell', 'crew'])('%s keeps its delivery goal while the furnace works', id => {
  const quest = questList.find(quest => quest.id === id)!
  expect(questNextStep(state({ quest, smelting: true, furnace: { ...empty, output: 1 } }))).toBe(quest.goal)
})

test('a granted trigger adds one line', () => {
  expect(grantHint('run')).toBe('Press ▶ next to a function. It runs once, this tick.')
  expect(grantHint('tick')).toBe('Loop calls that function every tick.')
  expect(grantHint('events')).toBe('on() runs a function when the works change.')
  expect(grantHint(undefined)).toBeUndefined()
})

test('a live drone task stays off the card', () => {
  const quest = { ...bram, batchCheck: 'open' as const }
  const cart: CartCue = { name: 'drone-1', cargo: 0, capacity: 3, carrying: null }
  const mining = state({
    quest,
    cart: { ...cart, task: 'mine', vein: 'A' },
  })
  const hauling = state({
    quest,
    cart: { ...cart, cargo: 1, carrying: 'ore', task: 'unload', at: 'furnace' },
  })
  expect(questNextStep(mining)).toBe('Load ore into the furnace.')
  expect(questNextStep(hauling)).toBe(questNextStep(mining))
  expect(questNextStep(state({
    quest,
    cart: { ...cart, cargo: 3, capacity: 3, carrying: 'ore', task: null },
  }))).toBe('Open drone-1 and choose Unload.')
  expect(questNextStep(state({
    quest,
    cart: { ...cart, cargo: 3, carrying: 'ore', task: 'unload', at: 'furnace' },
  }))).toBe('Open drone-1 and choose Unload.')
  expect(questNextStep(state({
    quest,
    cart: { ...cart, cargo: 2, carrying: 'ingot', task: 'pickup', phase: 'deliver' },
    furnace: { ...empty, output: 2 },
  }))).toBe('Carry the ingots to the depot.')
  expect(questNextStep(state({
    quest, smelting: true, furnace: { ...empty, input: 2 },
    cart: { ...cart, task: 'mine', vein: 'A' },
  }))).toBe('The furnace is smelting.')
  const odile = { from: 'Mayor Odile', goal: 'Bring Odile 4 steel.', item: 'steel' as const, qty: 4 }
  expect(questNextStep(state({
    quest: odile,
    furnace: { ...empty, input: 2, coal: 1 },
  }))).toBe('Open the furnace and choose Alloy.')
})

test('the status line names each drone and its task', () => {
  expect(droneStatusLine([])).toBe('')
  expect(droneStatusLine([{ name: 'drone-1', task: null }])).toBe('drone-1: idle')
  expect(droneStatusLine([{ name: 'drone-1', task: 'mine' }])).toBe('drone-1: mining')
  expect(droneStatusLine([{ name: 'drone-1', task: 'mine', vein: 'A' }])).toBe('drone-1: mining Vein A')
  expect(droneStatusLine([{ name: 'drone-1', task: 'unload' }])).toBe('drone-1: unloading')
  expect(droneStatusLine([{ name: 'drone-1', task: 'pickup' }])).toBe('drone-1: hauling')
  expect(droneStatusLine([
    { name: 'drone-1', task: 'mine', vein: 'A' },
    { name: 'drone-2', task: null },
  ])).toBe('drone-1: mining Vein A · drone-2: idle')
})

test('both carts reach the status bar after two distinct ticks with the same tasks', async () => {
  const world = shallowRef(createWorld(kettlewick))
  const first = world.value.drones[0]!
  const second = { ...first, name: 'drone-2' }
  world.value = { ...world.value, tick: 10, drones: [first, second] }
  const line = useDroneStatus(world)
  const idle = 'drone-1: idle · drone-2: idle'
  expect(line.value).toBe(idle)

  world.value = { ...world.value, tick: 11, drones: [
    { ...first, task: { kind: 'mine', vein: 'A', since: 11 } },
    { ...second, task: { kind: 'pickup', phase: 'fetch', since: 11 } },
  ] }
  await nextTick()
  expect(line.value).toBe(idle)
  world.value = { ...world.value }
  await nextTick()
  expect(line.value).toBe(idle)
  world.value = { ...world.value, tick: 12 }
  await nextTick()
  expect(line.value).toBe('drone-1: mining Vein A · drone-2: hauling')
})

test('a status line waits out a one-tick flicker', () => {
  let held = steadyLine(undefined, 'drone-1: idle')
  expect(held.shown).toBe('drone-1: idle')
  held = steadyLine(held, 'drone-1: mining Vein A')
  expect(held.shown).toBe('drone-1: idle')
  held = steadyLine(held, 'drone-1: idle')
  expect(held.shown).toBe('drone-1: idle')
  held = steadyLine(held, 'drone-1: mining Vein A')
  held = steadyLine(held, 'drone-1: mining Vein A')
  expect(held.shown).toBe('drone-1: mining Vein A')
  held = steadyLine(held, 'drone-1: mining Vein A')
  expect(held.shown).toBe('drone-1: mining Vein A')
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
