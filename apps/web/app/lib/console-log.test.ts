import { expect, test } from 'vitest'
import { appendConsoleLines } from './console-log'

test('a long run of repeated logs stays one row, with errors kept in sequence', () => {
  const tick = { tick: 1, text: 'tick', level: 'log' } as const
  const first = appendConsoleLines([], Array.from({ length: 300 }, (_, i) => ({ ...tick, tick: i + 1 })))
  const fault = { ...tick, level: 'error', file: 'main.ts', line: 4 } as const
  const next = appendConsoleLines(first, [fault, { ...fault, line: 5 }, tick])
  expect(first).toEqual([{ ...tick, tick: 300, count: 300 }])
  expect(next.slice(1)).toEqual([
    { ...fault, count: 1 },
    { ...fault, line: 5, count: 1 },
    { ...tick, count: 1 },
  ])
})
