import { questList } from '@inherit/sim/v8'
import { expect, test } from 'vitest'
import { questHistory } from './questJournal'

test('history follows the hand-over order and reads the title and change from each quest', () => {
  const bram = questList.find(quest => quest.id === 'bram')!
  const ines = questList.find(quest => quest.id === 'ines')!
  expect(questHistory(['bram', 'ines'], [ines, bram])).toEqual([
    { id: 'bram', title: bram.title, from: 'Bram', change: bram.change },
    { id: 'ines', title: ines.title, from: 'Ines', change: ines.change },
  ])
})

test('history skips legacy ids and uses the giver’s familiar name', () => {
  const odile = questList.find(quest => quest.id === 'odile')!
  expect(questHistory(['legacy', 'odile'], questList)).toEqual([
    { id: 'odile', title: odile.title, from: 'Odile', change: odile.change },
  ])
})
