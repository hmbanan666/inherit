import { expect, test } from 'vitest'
import {
  clampMapHeight,
  containPlace,
  containScale,
  checksPanePx,
  creditSuffix,
  defaultMapHeight,
  editorHeaderPx,
  filesNarrowPx,
  fitScale,
  formatCredits,
  mapHeightMax,
  mapHeightMin,
  questRailPx,
  readFilesOpen,
  consoleBody,
  readMapHeight,
  readPaneWidth,
  readSideTab,
  sideWidthMax,
  sideWidthMin,
  treeWidthMax,
  treeWidthMin,
  worksWidth,
} from './factoryLayout'

test('credits are written with a space', () => {
  expect(creditSuffix.startsWith(' ')).toBe(true)
  expect(formatCredits(300)).toBe('300 credits')
})

test('the quest rail stays 280px and the map uses the width beside it', () => {
  expect(questRailPx).toBe(280)
  expect(questRailPx).toBeGreaterThanOrEqual(260)
  expect(questRailPx).toBeLessThanOrEqual(300)
  const width = worksWidth(1024)
  expect(width).toBeGreaterThan(1024 * 0.6)
  expect(width).toBe(1024 - questRailPx - 8 * 2 - 8)
})

test('the map row defaults to 45% of the works column and a saved height stays in range', () => {
  expect(defaultMapHeight()).toBe(45)
  expect(readMapHeight(null)).toBe(45)
  expect(readMapHeight('45')).toBe(45)
  expect(readMapHeight('10')).toBe(mapHeightMin)
  expect(readMapHeight('90')).toBe(mapHeightMax)
  expect(readMapHeight('nope')).toBe(45)
  expect(clampMapHeight(45)).toBe(45)
})

test('the side pane remembers Tests or Console, and an old Checks choice opens Tests', () => {
  expect(readSideTab(null)).toBe('tests')
  expect(readSideTab('checks')).toBe('tests')
  expect(readSideTab('tests')).toBe('tests')
  expect(readSideTab('console')).toBe('console')
  expect(readSideTab('api')).toBe('tests')
})

test('the checks pane and the file tree remember a width inside a sane range', () => {
  expect(checksPanePx).toBeGreaterThanOrEqual(280)
  expect(checksPanePx).toBeLessThanOrEqual(320)
  expect(editorHeaderPx).toBeGreaterThan(0)
  expect(readPaneWidth(null, treeWidthMin, treeWidthMax, 140)).toBe(140)
  expect(readPaneWidth('10', treeWidthMin, treeWidthMax, 140)).toBe(treeWidthMin)
  expect(readPaneWidth('900', sideWidthMin, sideWidthMax, 300)).toBe(sideWidthMax)
  expect(readPaneWidth('nope', sideWidthMin, sideWidthMax, 300)).toBe(300)
  expect(consoleBody('main.ts:18 · drone-1 keeps 2 ore')).toBe('drone-1 keeps 2 ore')
  expect(consoleBody('smelt() makes ingots.')).toBe('smelt() makes ingots.')
})

test('the file tree starts collapsed on a narrow window and open on a wide one', () => {
  expect(readFilesOpen(null, filesNarrowPx - 1)).toBe(false)
  expect(readFilesOpen(null, 1024)).toBe(false)
  expect(readFilesOpen(null, filesNarrowPx)).toBe(true)
  expect(readFilesOpen('open', 800)).toBe(true)
  expect(readFilesOpen('closed', 1920)).toBe(false)
})

test('the fit keeps the whole grid inside the frame', () => {
  const worldW = 16 * 96
  const worldH = 6 * 96
  for (const [w, h] of [[461, 662], [720, 280], [900, 220], [1200, 400]] as const) {
    const scale = fitScale(w, h, worldW, worldH)
    expect(scale).toBeCloseTo(containScale(w, h, worldW, worldH))
    expect(worldW * scale).toBeLessThanOrEqual(w + 0.01)
    expect(worldH * scale).toBeLessThanOrEqual(h + 0.01)
    const touchesWidth = Math.abs(worldW * scale - w) < 0.05
    const touchesHeight = Math.abs(worldH * scale - h) < 0.05
    expect(touchesWidth || touchesHeight).toBe(true)
    const place = containPlace(w, h, worldW, worldH)
    expect(place.x).toBeCloseTo((w - worldW * place.scale) / 2)
    expect(place.y).toBeCloseTo((h - worldH * place.scale) / 2)
    expect(place.x).toBeGreaterThanOrEqual(-0.01)
    expect(place.y).toBeGreaterThanOrEqual(-0.01)
  }
})
