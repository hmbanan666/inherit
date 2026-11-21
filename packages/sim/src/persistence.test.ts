import { expect, test } from 'vitest'
import {
  connectBelt,
  placeMachine,
  removeBelt,
  removeMachine,
  cloneCampaign,
  createCampaign,
  townSnapshot,
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

test('an existing chapter keeps its work, clears old terms and refunds paid interest once', () => {
  const c = createCampaign(91)
  c.town.beat = 8
  c.town.payments = 1
  c.town.paid = 110
  c.economy.money = 45
  c.world.tick = 13000
  c.town.filled = 2
  Object.assign(c.town, { due: 700, interest: [true, true, true], installments: [110, 220, 330] })
  c.economy.orders.push({
    id: 'order-4',
    customer: 'elsie',
    items: { plate: 8 },
    filled: { plate: 2 },
    status: 'accepted',
    pay: 32,
    reputation: 1,
    line: 'Oven grate',
    duration: 700,
    deadline: 12000,
  })
  for (const id of ['tab', 'interest-0', 'competition'])
    c.progress.messages.push({ ...c.progress.messages[0], id, body: 'Old terms', unread: false })

  const restored = loadSave(serializeSave(c))
  expect(restored.world.tick).toBe(13000)
  expect(restored.town).toMatchObject({ beat: 8, filled: 2, payments: 1, paid: 100 })
  expect(restored.economy.money).toBe(55)
  expect(townSnapshot(restored).debt).toEqual({ paid: 100, owed: 500, next: { amount: 200 } })
  expect(restored.economy.orders[0]).toMatchObject({ id: 'order-4', filled: { plate: 2 }, pay: 32 })
  expect(restored.progress.messages.map((m) => m.id)).toEqual(['uncle', 'tab', 'competition'])
  expect(restored.progress.messages.slice(1).every((m) => !m.unread && m.body !== 'Old terms')).toBe(true)
  const clean = serializeSave(restored)
  expect(clean).not.toMatch(/"(due|interest|installments|deadline|duration)":/)
  expect(loadSave(clean)).toEqual(restored)
})

test.each(['import { mine } from "inherit"; mine.dig()', 'export function onTick(ctx) {ctx.work("furnace")}'])(
  'the previous chapter restarts with its working and deployed code archived', source => {
    const old = createCampaign()
    old.town.beat = 9
    old.project.working = {'main.ts':source,'verbs/unfinished.ts':'// draft'}
    const fresh = loadSave({...old,version:4})
    expect(fresh.town.beat).toBe(1)
    expect(fresh.project.working).toEqual(createCampaign().project.working)
    expect(fresh.project.snapshots.find(s => s.name === 'Previous chapter code')?.files).toEqual(old.project.working)
  })
