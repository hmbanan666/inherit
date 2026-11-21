import { expect, test } from 'vitest'
import { townFrames } from './townFixture'

test('the bridge opens Riverside and brings Ines and Pell to town', () => {
  const before = townFrames.find((frame) => frame.name === 'Mill turning')!.snapshot
  const after = townFrames.find((frame) => frame.name === 'Bridge built')!.snapshot
  expect(before.buildings.find((b) => b.id === 'riverside')?.state).toBe('locked')
  expect(before.people.some((p) => p.id === 'ines')).toBe(false)
  expect(after.people.map((p) => p.id)).toEqual(expect.arrayContaining(['ines', 'pell']))
  expect(after.changes.slice(-2).map((c) => c.buildingId)).toEqual(['bridge', 'riverside'])
})
