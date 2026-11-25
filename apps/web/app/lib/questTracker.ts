import type { readChecks } from '@inherit/sim/v8'

type TestRow = ReturnType<typeof readChecks>[number]

export const trackerKey = 'inherit.v8.tracker'

export function readTrackerOpen(stored: string | null) {
  return stored !== 'closed'
}

export function trackerRows(rows: readonly TestRow[], max = 3) {
  const firstOpen = rows.find(row => row.state !== 'passing')
  const ordered = firstOpen ? [firstOpen, ...rows.filter(row => row !== firstOpen)] : rows
  const visible = ordered.slice(0, Math.max(0, max))
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
