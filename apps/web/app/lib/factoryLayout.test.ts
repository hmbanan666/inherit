import { expect, test } from 'vitest'
import {
  columnWidths,
  containScale,
  creditSuffix,
  editorDockPercent,
  filesNarrowPx,
  fitScale,
  formatCredits,
  questRailPx,
  readFilesOpen,
} from './factoryLayout'

test('credits are written with a space', () => {
  expect(creditSuffix.startsWith(' ')).toBe(true)
  expect(formatCredits(300)).toBe('300 credits')
})

test('at 1024px the map is at least 45% of the window and the largest column', () => {
  const width = 1024
  const columns = columnWidths(width)
  expect(columns.quest).toBe(questRailPx)
  expect(columns.quest).toBeGreaterThanOrEqual(260)
  expect(columns.quest).toBeLessThanOrEqual(300)
  expect(columns.map / width).toBeGreaterThanOrEqual(0.45)
  expect(columns.map).toBeGreaterThan(columns.editor)
  expect(columns.map).toBeGreaterThan(columns.quest)
  expect(editorDockPercent(width)).toBeLessThanOrEqual(40)
})

test('wide windows put the editor in the 35–40% band and give further width to the map', () => {
  for (const width of [1600, 1800, 1920, 2560]) {
    const dock = editorDockPercent(width)
    const columns = columnWidths(width, dock)
    expect(dock).toBeGreaterThanOrEqual(35)
    expect(dock).toBeLessThanOrEqual(38.01)
    expect(columns.map / width).toBeGreaterThanOrEqual(0.45)
  }
  expect(columnWidths(1920).map / 1920).toBeGreaterThan(columnWidths(1024).map / 1024)
  expect(columnWidths(2560).map / 2560).toBeGreaterThan(columnWidths(1920).map / 1920)
})

test('the file tree starts collapsed on a narrow window and open on a wide one', () => {
  expect(readFilesOpen(null, filesNarrowPx - 1)).toBe(false)
  expect(readFilesOpen(null, 1024)).toBe(false)
  expect(readFilesOpen(null, filesNarrowPx)).toBe(true)
  expect(readFilesOpen('open', 800)).toBe(true)
  expect(readFilesOpen('closed', 1920)).toBe(false)
})

test('a tall map frame is covered so the grid is not a short band, and a short frame shows the whole grid', () => {
  const worldW = 16 * 96
  const worldH = 6 * 96
  const tall = fitScale(461, 662, worldW, worldH)
  expect(tall).toBeCloseTo(662 / worldH)
  expect(worldW * tall).toBeGreaterThan(461)
  expect(worldH * tall).toBeCloseTo(662)
  expect(tall).toBeGreaterThan(containScale(461, 662, worldW, worldH))

  const short = fitScale(900, 220, worldW, worldH)
  expect(short).toBeCloseTo(containScale(900, 220, worldW, worldH))
  expect(worldW * short).toBeLessThanOrEqual(900 + 0.01)
  expect(worldH * short).toBeCloseTo(220)
})
