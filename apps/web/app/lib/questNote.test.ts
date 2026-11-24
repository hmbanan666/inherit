import { expect, test } from 'vitest'
import { deliveryNote, firstOpenTest, goalLabel, insertQuestNote, quantityLabel, questComment } from './questNote'
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

test('the rail names the quantity, and a trigger example is inserted once', () => {
  expect(quantityLabel('Bram', 'ingot', 2, 1)).toEqual({ text: 'Delivered to Bram · 1/2 ingots', value: 1, max: 2 })
  expect(quantityLabel('Mayor Odile', 'steel', 4, 9)).toEqual({ text: 'Delivered to Odile · 4/4 steel', value: 4, max: 4 })
  expect(deliveryNote('Need 2 ingots. An ingot is smelted from ore.')).toBe(
    'Need 2 ingots. An ingot is smelted from ore. Collect sends a drone from the furnace to the depot.',
  )
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

test('a delivery goal names the depot count', () => {
  expect(goalLabel('done', 'steel', 4, 0, false).text).toBe('Steel at the depot 0/4')
  expect(goalLabel('done', 'ingot', 60, 12, false)).toMatchObject({ text: 'Ingots at the depot 12/60', value: 12, max: 60 })
  expect(goalLabel('ore', 'ingot', 4, 0, false).text).toBe('Ore at the furnace 0/1')
})
