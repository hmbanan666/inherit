import { expect, test } from 'vitest'
import { goalLabel, insertQuestNote, questComment } from './questNote'

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

test('a delivery goal names the depot count', () => {
  expect(goalLabel('done', 'steel', 4, 0, false).text).toBe('Steel at the depot 0/4')
  expect(goalLabel('done', 'ingot', 60, 12, false)).toMatchObject({ text: 'Ingots at the depot 12/60', value: 12, max: 60 })
  expect(goalLabel('ore', 'ingot', 4, 0, false).text).toBe('Ore at the furnace 0/1')
})
