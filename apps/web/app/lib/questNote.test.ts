import { acceptQuest, createWorld, kettlewick, migrateWorld, questList, runTicks, settleTriggers } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { deliveryNote, firstOpenTest, goalLabel, insertQuestNote, quantityLabel, questCard, questComment, questSummary } from './questNote'
import { questNextStep } from './questStep'
import { insertTriggerExample, triggerExample } from './triggerNote'

const odile = questComment('Mayor Odile', 'steel is ore and coal together. Where would they meet?')

test('taking a quest inserts one comment and does not put it back', () => {
  expect(odile).toBe('// Odile: steel is ore and coal together. Where would they meet?')
  const file = 'export function onTick() {}\n'
  const first = insertQuestNote(file, odile, 'odile', [])
  expect(first.source).toBe(`${odile}\n${file}`)
  expect(first.remembered).toEqual(['odile'])
  const deleted = insertQuestNote(file, odile, 'odile', first.remembered)
  expect(deleted.source).toBe(file)
  expect(deleted.remembered).toEqual(['odile'])
  const again = insertQuestNote(first.source, odile, 'odile', [])
  expect(again.source).toBe(first.source)
  expect(again.source.split('\n').filter(line => line.trim() === odile)).toHaveLength(1)
})

test('the code example follows the nudge once, including when the file already has the nudge', () => {
  const quest = questList.find(q => q.id === 'ines')!
  const nudge = questComment(quest.from, quest.nudge)
  const example = '// Example: if (!drone.busy) drone.unload(depot)'
  const file = 'export function mine() {}'
  const block = [nudge, example, file].join('\n')
  for (const source of [file, nudge + '\n' + file, block]) {
    const inserted = insertQuestNote(source, nudge, quest.id, [], example)
    expect(inserted).toEqual({ source: block, remembered: [quest.id] })
    expect(insertQuestNote(file, nudge, quest.id, inserted.remembered, example).source).toBe(file)
  }
})

test('the rail names the quantity, and a trigger example is inserted once', () => {
  expect(quantityLabel({ from: 'Bram', item: 'ingot', qty: 1, shipped: 0 })).toEqual({ text: 'Delivered to Bram · 0/1 ingot', value: 0, max: 1 })
  expect(quantityLabel({ from: 'Mayor Odile', item: 'steel', qty: 4, shipped: 9 })).toEqual({ text: 'Delivered to Odile · 4/4 steel', value: 4, max: 4 })
  expect(firstOpenTest([
    { id: 'memory', state: 'pending' },
    { id: 'done', state: 'passing' },
  ])).toBe('memory')
  const file = 'export function smeltOnce() {}\n'
  const run = insertTriggerExample(file, 'run', [])
  expect(run.source.startsWith(triggerExample('run').source)).toBe(true)
  expect(run.source).toContain('drone.mine')
  const again = insertTriggerExample(file, 'run', run.remembered)
  expect(again.source).toBe(file)
  const loop = insertTriggerExample('export function onTick() {}\n', 'tick', [])
  expect(loop.source).toBe('export function onTick() {}\n')
  expect(loop.remembered).toEqual(['trigger:tick'])
})

test('only an outstanding furnace delivery needs Collect', () => {
  for (const quest of questList) {
    const order = { ...quest, shipped: 0 }
    const hint = quest.item === 'ingot' || quest.item === 'steel' ? ' Collect sends a drone from the furnace to the depot.' : ''
    expect(deliveryNote(quest.need, order)).toBe(quest.need + hint)
    expect(deliveryNote(quest.need, { ...order, shipped: order.qty })).toBe(quest.need)
  }
})

test('a delivery goal names the depot count', () => {
  expect(goalLabel('done', 'steel', 4, 0, false).text).toBe('Steel at the depot 0/4')
  expect(goalLabel('done', 'ingot', 60, 12, false)).toMatchObject({ text: 'Ingots at the depot 12/60', value: 12, max: 60 })
  expect(goalLabel('ore', 'ingot', 4, 0, false).text).toBe('Ore at the furnace 0/1')
})

function advance(world: ReturnType<typeof createWorld>) {
  runTicks(world, kettlewick, 1, () => {
    settleTriggers(world, kettlewick)
    return { used: 0 }
  })
}

function accepted(id: string) {
  const world = createWorld(kettlewick)
  const index = questList.findIndex(quest => quest.id === id)
  const quest = questList[index]!
  world.cleared = questList.slice(0, index).map(previous => previous.id)
  world.level = quest.needLevel
  expect(acceptQuest(world, kettlewick, id)).toBe(true)
  return { world, quest, order: world.orders[0]! }
}

test('resuming a Harrow ingot order keeps the card, Tests and footer on the saved shipment', () => {
  const { world, quest, order } = accepted('harrow')
  Object.assign(order, { item: 'ingot', qty: 60, shipped: 12, text: 'Bring Harrow 60 ingots.' })
  delete order.lines
  const resumed = migrateWorld(structuredClone(world))
  advance(resumed)
  const card = questCard(resumed, quest)!
  expect(card.quantity).toEqual({ text: 'Delivered to Harrow · 12/60 ingots', value: 12, max: 60 })
  expect(card.ask).toBe('Bring Harrow 60 ingots.')
  expect(card.needText).toContain('Need 60 ingots.')
  expect(card.tests).toMatchObject([{ id: 'done', text: 'Harrow receives the saved order', state: 'pending' }])
  expect(card.remainingTest).toBeUndefined()
  expect(card.ready).toBe(false)

  resumed.depot.ingots = 48
  advance(resumed)
  const full = questCard(resumed, quest)!
  expect(full.ready).toBe(true)
  expect(full.tests).toMatchObject([{ id: 'done', state: 'passing' }])
  expect(handOver(full)).toBe('Hand over 60 ingots')
})

function handOver(card: NonNullable<ReturnType<typeof questCard>>) {
  return questNextStep({
    quest: card, ready: card.ready, shipped: card.shipped, loop: false,
    furnace: { input: 0, coal: 0, output: 0, steel: 0 }, made: { ingots: 0, steel: 0 },
  })
}

test('the Harrow preview and accepted order show both lines as the depot fills them', () => {
  const { world, quest } = accepted('harrow')
  const preview = questCard(createWorld(kettlewick), quest)!
  expect(preview.quantity.text).toBe('0/1 plate, 0/1 blank')
  world.depot.bin!.qty.plate = 1
  advance(world)
  const partial = questCard(world, quest)!
  expect(partial.quantity).toEqual({ text: '1/1 plate, 0/1 blank', value: 1, max: 2 })
  expect(partial.tests).toMatchObject([{ id: 'plate', state: 'passing' }, { id: 'blank', state: 'pending' }])
  world.depot.bin!.qty.blank = 1
  advance(world)
  expect(handOver(questCard(world, quest)!)).toBe('Hand over 1 plate and 1 blank')
})

test('the crew card counts each labeled crate in manifest order', () => {
  const { world, quest } = accepted('crew')
  expect(questCard(createWorld(kettlewick), quest)!.quantity.text).toBe('0/1 winch crate, 0/1 lamp crate')
  world.depot.bin!.qty.winch = 1
  advance(world)
  const partial = questCard(world, quest)!
  expect(partial.quantity).toEqual({ text: '1/1 winch crate, 0/1 lamp crate', value: 1, max: 2 })
  expect(partial.tests).toMatchObject([{ id: 'winch', state: 'passing' }, { id: 'lamp', state: 'pending' }])
  world.depot.bin!.qty.lamp = 1
  advance(world)
  const full = questCard(world, quest)!
  expect(full.quantity.text).toBe('1/1 winch crate, 1/1 lamp crate')
  expect(handOver(full)).toBe('Hand over 1 winch crate and 1 lamp crate')
})

test('a full Bram shipment points the footer at the open batch check', () => {
  const { world, quest } = accepted('bram')
  world.depot.ingots = 1
  advance(world)
  const card = questCard(world, quest)!
  expect(card.remainingTest).toBe('ingot')
  expect(card.ready).toBe(false)
  expect(card.batchCheck).toBe('open')
  expect(card.needText).toBe(quest.need)
})

test('one resolved goal keeps the coded batch, both haulers and crate sequence in previews and open orders', () => {
  for (const id of ['bram', 'elsie', 'crew']) {
    const quest = questList.find(entry => entry.id === id)!
    const world = createWorld(kettlewick)
    world.cleared = questList.slice(0, questList.indexOf(quest)).map(previous => previous.id)
    world.level = quest.needLevel
    if (id === 'elsie') world.drones.push({ ...world.drones[0]!, name: 'drone-2' })
    const summary = questSummary(world, quest)!
    expect(summary).toEqual({ quote: quest.quote, goal: quest.goal, quantity: questCard(world, quest)!.quantity })
    expect(acceptQuest(world, kettlewick, id)).toBe(true)
    expect(questSummary(world, quest)).toEqual(summary)
  }
})

test('a resumed Harrow summary keeps the saved delivery goal and its receipt', () => {
  const { world, quest, order } = accepted('harrow')
  Object.assign(order, { item: 'ingot', qty: 60, shipped: 12, text: 'Bring Harrow 60 ingots.' })
  delete order.lines
  const resumed = migrateWorld(structuredClone(world))
  expect(questSummary(resumed, quest)).toEqual({
    quote: quest.quote, goal: order.text,
    quantity: { text: 'Delivered to Harrow · 12/60 ingots', value: 12, max: 60 },
  })
})

test('reading an open summary leaves the worker snapshot untouched', () => {
  const { world, quest } = accepted('bram')
  world.checkMoved = {}
  const before = structuredClone(world)
  expect(questSummary(world, quest)?.goal).toBe(quest.goal)
  expect(world).toEqual(before)
})
