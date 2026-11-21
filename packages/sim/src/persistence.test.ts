import { expect, test } from 'vitest'
import {
  connectBelt,
  placeMachine,
  removeBelt,
  removeMachine,
  cloneCampaign,
  createCampaign,
  deployProject,
  loadSave,
  rollbackProject,
  serializeSave,
  snapshotProject,
  step,
} from './index'

test('save, load and preview preserve independent live and working projects and deterministic state', () => {
  const c = createCampaign(109)
  c.project.working['lib/feed.ts'] = 'export const count = 1'
  const snap = snapshotProject(c, 'one')
  c.project.working['lib/feed.ts'] = 'export const count = 2'
  deployProject(c)
  c.project.working['main.ts'] += '// unfinished'
  c.memory = { runs: [1, { count: 2 }] }
  step(c.world, (ctx) => ctx.dig('mine'))
  const saved = serializeSave(c)
  const restored = loadSave(saved)
  const preview = cloneCampaign(restored)
  expect(serializeSave(restored)).toBe(saved)
  expect(rollbackProject(preview, snap.id)).toBe(true)
  expect(preview.project.deployed['lib/feed.ts']).toContain('= 1')
  preview.memory.runs = []
  step(preview.world, (ctx) => ctx.dig('mine'))
  expect(serializeSave(restored)).toBe(saved)
  expect(serializeSave(c)).toBe(saved)
})
test.each([1, 2, 3])('old save version %i starts a fresh shed and keeps the working files', (version) => {
  const files = { 'main.ts': 'old controller', 'lib/belts.ts': 'unfinished helper' }
  const c = loadSave({ version, project: { working: files } })
  expect(c.world.tick).toBe(0)
  expect(c.world.belts).toHaveLength(0)
  expect(c.project.working).toEqual(createCampaign().project.working)
  expect(c.project.snapshots).toContainEqual(expect.objectContaining({ name: 'v2 code', files }))
})
test('the selected notebook entry and earlier chapters survive as snapshots', () => {
  const c = loadSave({ current: 2, entries: { 0: { code: 'first' }, 2: { code: 'more' } } })
  expect(c.project.snapshots.map((s) => [s.name, s.files['main.ts']])).toEqual([
    ['Chapter 1', 'first'],
    ['v2 code', 'more'],
  ])
  expect(c.project.working).toEqual(createCampaign().project.deployed)
})
test('garbage, unknown versions and broken belt references start fresh', () => {
  const broken = createCampaign()
  connectBelt(broken, 'mine', 'furnace')!.to = 'missing'
  for (const data of ['{bad', null, false, [], { version: 65 }, broken])
    expect(loadSave(data)).toEqual(createCampaign())
})
test('reloading a loaded truck and an unacknowledged delivery keeps its original manifest', () => {
  let c = createCampaign(44)
  removeBelt(c, 'mine', 'furnace-a')
  placeMachine(c, 'depot', 'shed', 2, 2, 'origin')
  placeMachine(c, 'truck', 'shed', 3, 1, 'truck')
  placeMachine(c, 'depot', 'yard', 0, 2, 'dest')
  connectBelt(c, 'mine', 'origin')
  c.world.tripScript = ['lostAck']
  for (let t = 0; t < 15; t++) {
    step(c.world, (ctx) => {
      if (ctx.tick === 1) ctx.dig('mine')
      ctx.dispatch('truck', 'origin', 'dest', 'shipment')
    })
    if (c.world.trips.length) expect(removeMachine(c, 'origin')).toBe(false)
    c = loadSave(serializeSave(c))
  }
  expect(c.world.delivered).toEqual({})
  expect(c.world.receipts).toMatchObject([{ key: 'shipment', acknowledged: true }])
  expect(c.world.machines.find((m) => m.id === 'dest')?.queue).toEqual([{ kind: 'iron-ore' }])
})
test('an unfinished file rename can be saved without changing the deployed entry point', () => {
  const c = createCampaign()
  c.project.working = { 'lib/belts.ts': 'export const belt = 1' }
  const snapshot = snapshotProject(c, 'During rename')
  expect(loadSave(serializeSave(c))).toEqual(c)
  const before = serializeSave(c)
  expect(() => deployProject(c)).toThrow(/main.ts/)
  expect(rollbackProject(c, snapshot.id)).toBe(false)
  expect(serializeSave(c)).toBe(before)
})
