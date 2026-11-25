import type { readChecks } from '@inherit/sim/v8'

type TestRow = ReturnType<typeof readChecks>[number]

export const trackerKey = 'inherit.v8.tracker'

export function readTrackerOpen(stored: string | null) {
  return stored !== 'closed'
}

export function trackerRows(rows: readonly TestRow[], max = 3) {
  const visible = rows.slice(0, Math.max(0, max))
  const firstOpen = rows.find(row => row.state !== 'passing')
  if (firstOpen && visible.length > 0 && !visible.includes(firstOpen)) {
    visible[visible.length - 1] = firstOpen
  }
  return { rows: visible, more: rows.length - visible.length }
}

export function testMark(state: TestRow['state']) {
  if (state === 'passing') return '✓'
  if (state === 'failed') return '!'
  return '·'
}

export function testLabel(state: TestRow['state'], text: string) {
  const name = state === 'passing' ? 'Passing' : state === 'failed' ? 'Failed' : 'Open'
  return `${name}: ${text}`
}
