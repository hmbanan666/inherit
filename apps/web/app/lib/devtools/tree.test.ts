import { expect, test } from 'vitest'
import { treeRows, movePaths } from './tree'

test('open folders expose their children and moving a folder preserves nested filenames', () => {
  const paths = ['main.ts', 'lib/pump.ts', 'lib/ore/dig.ts', 'parts/index.ts']
  const rows = treeRows(paths, new Set(['lib/ore', 'parts']))
  expect(rows.map((r) => r.path)).toEqual(['lib', 'lib/ore', 'lib/pump.ts', 'parts', 'main.ts'])
  expect(movePaths('lib', 'machines', paths)).toEqual([
    ['lib/pump.ts', 'machines/pump.ts'],
    ['lib/ore/dig.ts', 'machines/ore/dig.ts'],
  ])
  expect(() => movePaths('lib', 'parts', paths)).toThrow()
  expect(() => movePaths('main.ts', 'old.ts', paths)).toThrow()
})
