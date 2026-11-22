import { afterEach, expect, test, vi } from 'vitest'
import { createLineHighlight } from './line-highlight'

afterEach(() => vi.useRealTimers())

test('loop calls keep the same decoration and display only the latest line after its dwell', () => {
  vi.useFakeTimers()
  const paint = vi.fn()
  const highlight = createLineHighlight(paint)
  const first = { file: 'main.ts', line: 2 }
  const second = { file: 'main.ts', line: 3 }
  highlight.show(first)
  highlight.show({ ...first })
  highlight.show(second)
  vi.advanceTimersByTime(50)
  highlight.show(first)
  vi.advanceTimersByTime(100)
  expect(paint.mock.calls).toEqual([[first]])

  highlight.show(second)
  highlight.show({ file: 'main.ts', line: 4 })
  vi.advanceTimersByTime(80)
  expect(paint.mock.calls).toEqual([[first], [second]])
  const latest = { file: 'tools.ts', line: 3 }
  highlight.show(latest)
  vi.advanceTimersByTime(80)
  expect(paint.mock.calls).toEqual([[first], [second], [latest]])
  highlight.show(undefined)
  vi.runAllTimers()
  expect(paint).toHaveBeenLastCalledWith(undefined)
})
