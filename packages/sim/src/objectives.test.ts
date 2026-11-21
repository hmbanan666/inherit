import { expect, test } from 'vitest'
import {
  createCampaign,
  OBJECTIVES,
  objectiveTrack,
  objectiveProgress,
  advanceGame,
  removeBelt,
  placeMachine,
  connectBelt,
  loadSave,
  serializeSave,
} from './index'

test('each card exposes a concrete highlight and the unit for its one counter', () => {
  const c = createCampaign()
  for (const objective of OBJECTIVES) {
    expect(objective.title).not.toMatch(/\n/)
    expect(objective.why.length).toBeLessThanOrEqual(140)
    expect(objective.hints.length).toBeGreaterThan(0)
    expect(objective.highlight, objective.id).toBeDefined()
    expect(objective.progressUnit, objective.id).toBeTruthy()
    expect(objective.hints.join('\n').split('\n').length).toBeLessThanOrEqual(3)
    expect(objectiveProgress(c, objective.id)?.target).toBeGreaterThan(0)
  }
  expect(objectiveTrack(c).active?.highlight).toMatchObject({ type: 'machine', id: 'mine' })
})

test('an island shipment counts even when the player leaves the timed ticket on the board', () => {
  const c = createCampaign()
  c.progress.completedObjectives = OBJECTIVES.slice(
    0,
    OBJECTIVES.findIndex((s) => s.id === 'tram'),
  ).map((s) => s.id)
  c.world.delivered.motor = 2
  expect(objectiveTrack(c).progress).toEqual({ current: 2, target: 3 })
  c.world.machines.find((m) => m.kind === 'dock')!.queue.push({ kind: 'motor' })
  expect(advanceGame(c, () => {}).completed).toEqual(['tram'])
})

test('the new coal memory lesson preserves an in-progress gate request from an earlier save', () => {
  const c = createCampaign()
  c.progress.completedObjectives = [
    'dig',
    'fire',
    'ingot',
    'shed',
    'loading',
    'tally',
    'chalk',
    'redeploy',
    'plot',
    'oven',
    'belt',
    'gauges',
    'fork',
    'balance',
    'coal',
    'press',
    'part',
    'parts',
    'clock',
  ]
  c.progress.objectiveRun = { startTick: 100, revision: 0 }
  c.world.tick = 101
  c.world.delivered.part = 12
  c.progress.activeQuest = { id: 'gate', startTick: 100, shipped: 9, lost: 0, coal: 0, furnaceActive: {} }
  c.memory.coal = 1
  const money = c.economy.money
  expect(objectiveProgress(c, 'fork-belts')?.state).toBe('complete')
  expect(advanceGame(c, () => {}).completed).toEqual(['coal-memory'])
  expect(c.economy.money).toBe(money + 20)
  expect(objectiveTrack(c)).toMatchObject({ active: { id: 'gate' }, progress: { current: 3, target: 5 } })
})

test('a completed workshop stays in free play when new lessons are added', () => {
  const c = createCampaign()
  c.progress.completedObjectives.push('network')
  expect(objectiveTrack(c).active).toBeUndefined()
  expect(objectiveProgress(c, 'motor-gear')?.state).toBe('complete')
  expect(advanceGame(c, () => {}).moneyDelta).toBe(0)
})

test('the routing card remembers each furnace independently across a long pause and reload', () => {
  let c = createCampaign()
  c.progress.completedObjectives = ['fork-belts']
  removeBelt(c, 'mine', 'furnace-a')
  placeMachine(c, 'splitter', 'shed', 2, 2, 'split')
  placeMachine(c, 'furnace', 'shed', 4, 3, 'second')
  connectBelt(c, 'mine', 'split')
  connectBelt(c, 'split', 'furnace-a')
  connectBelt(c, 'split', 'second')
  c.economy.research.push('fork')
  const feed = (target: string) => {
    for (let i = 0; i < 12; i++)
      advanceGame(c, (ctx) => {
        if (ctx.space('mine')) ctx.dig('mine')
        ctx.route?.('split', target)
      })
  }
  feed('furnace-a')
  expect(objectiveTrack(c).progress).toEqual({ current: 1, target: 2 })
  for (let i = 0; i < 260; i++) advanceGame(c, () => {})
  c = loadSave(serializeSave(c))
  expect(objectiveTrack(c).progress).toEqual({ current: 1, target: 2 })
  feed('second')
  expect(objectiveProgress(c, 'share-ore')).toEqual({ state: 'complete', current: 2, target: 2 })
  expect(objectiveTrack(c).active?.id).toBe('balance')
})
