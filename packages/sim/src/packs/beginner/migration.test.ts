import { expect, test } from 'vitest'
import { migrateBeginner } from '../../framework/migrate'
import { runPack } from '../../../../sandbox/src/pack-run'
import pack from './pack'

const migrate = (raw: string) => migrateBeginner(pack, raw, async (save, files) => {
  await runPack(pack, save, files)
  expect(save.phase, save.lessonId ?? 'finish').toBe('solved')
})

const world = {
  bubble: 'Hello!', bed: 'gate', gateFlowers: 3, houseFlowers: 4,
  sign: 'Willow', flag: 'gold', basket: 5, bell: 1, shutters: true, ribbons: 6,
  raining: false, canopy: false, picnic: true, lamps: [1, 2, 3, 4, 5],
  neighbours: ['Mira', 'Pip', 'Ada'], stalls: [], banner: false,
}

function legacy(completed: string[], lessonId: string | null) {
  return JSON.stringify({
    formatVersion: 1,
    packVersion: 1,
    packId: 'beginner',
    completed,
    lessonId,
    phase: 'solved',
    passed: ['check-1'],
    pendingReveals: ['village'],
    released: [],
    seenSections: [],
    world,
    entryWorld: world,
    project: {
      working: { 'main.ts': '// My village draft' },
      activeFile: 'main.ts',
      deployed: null,
      history: [],
      snapshots: [],
      nextRevision: 1,
    },
    clockActive: false,
  })
}

test('old completions survive by id across the first new lesson', async () => {
  const save = await migrate(legacy([
    'hello', 'flowers', 'house-sign', 'flag', 'apple-basket', 'morning', 'flower-row',
    'ribbons', 'weather', 'picnic', 'path-lamps', 'neighbours', 'village-fair',
  ], null))
  expect(save.lessonId).toBe('sign-spaces')
  expect(save.completed).toEqual([
    'hello', 'flowers', 'apple-basket', 'house-sign', 'flag', 'morning',
    'weather', 'neighbours', 'path-lamps', 'flower-row',
  ])
})

test('preserves solved but uncontinued code and keeps a later draft with its lesson', async () => {
  const current = await migrate(legacy([], 'hello'))
  expect(current.project.working['main.ts']).toBe('// My village draft')
  expect(current.phase).toBe('brief')
  expect(current.completed).toEqual([])
  const later = await migrate(legacy(['hello'], 'flowers'))
  expect(later.project.working['main.ts']).toContain('boat ticket')
  expect(later.drafts.flowers.files['main.ts']).toBe('// My village draft')
})

test('a corrupt source world cannot be replaced by a fresh course', async () => {
  const source = JSON.parse(legacy([], 'hello'))
  source.entryWorld.lamps = ['lit']
  await expect(migrate(JSON.stringify(source))).rejects.toThrow()
})
