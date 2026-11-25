import { expect, test } from 'vitest'
import { readTrackerOpen, testLabel, testMark, trackerRows } from './questTracker'

const passing = ['a', 'b', 'c'].map(id => ({ id, text: id, state: 'passing' as const }))

test('the tracker keeps the pending test in list order after three passing tests', () => {
  const pending = { id: 'd', text: 'd', state: 'pending' as const }
  expect(trackerRows([...passing, pending], 3)).toEqual({
    rows: [passing[0], passing[1], pending], more: 1,
  })
})

test('the first failed test brings its reason to the tracker', () => {
  const failed = { id: 'd', text: 'd', state: 'failed' as const, reason: 'Hopper full' }
  expect(trackerRows([...passing, failed], 1)).toEqual({ rows: [failed], more: 3 })
})

test('an open test at the start is followed by the next row', () => {
  const open = { id: 'd', text: 'd', state: 'pending' as const }
  expect(trackerRows([open, ...passing], 2)).toEqual({ rows: [open, passing[0]], more: 2 })
})

test('an empty tracker has no hidden rows', () => {
  expect(trackerRows([])).toEqual({ rows: [], more: 0 })
})

test('the tracker starts expanded unless the saved choice is closed', () => {
  expect(readTrackerOpen(null)).toBe(true)
  expect(readTrackerOpen('closed')).toBe(false)
  expect(readTrackerOpen('open')).toBe(true)
  expect(readTrackerOpen('junk')).toBe(true)
})

test.each([
  ['passing', '✓', 'Passing'],
  ['pending', '·', 'Open'],
  ['failed', '!', 'Failed'],
] as const)('the tracker and Tests share the %s mark and accessible label', (state, mark, label) => {
  expect(testMark(state)).toBe(mark)
  expect(testLabel(state, 'A test')).toBe(`${label}: A test`)
})
