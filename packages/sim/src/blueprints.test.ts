import { expect, test } from 'vitest'
import {
  advanceGame,
  apiDeclarations,
  createCampaign,
  research,
  OBJECTIVES,
  purchaseMachine,
  purchaseBelt,
  sellBelt,
  objectiveTrack,
  loadSave,
  serializeSave,
} from './index'

test('Blueprint API requires the binder and licenses construction in the controller and editor', () => {
  const c = createCampaign()
  c.economy.researchPoints = 20
  expect(research(c, 'blueprints')).toBe(false)
  advanceGame(c, (ctx) => expect(ctx.build).toBeUndefined())
  expect(apiDeclarations(c)).not.toMatch(/\b(build|dismantle|connect|lastError)\(/)
  for (const node of ['bins', 'fork', 'binder', 'blueprints']) expect(research(c, node)).toBe(true)
  advanceGame(c, (ctx) => {
    expect(ctx.build!('furnace', 5, 2)).toBe('furnace-1')
    expect(ctx.inspect!('furnace-1')?.x).toBe(5)
    expect(ctx.connect!('furnace-1', 'dock')).toBe(true)
    expect(c.economy.money).toBe(70)
    expect(ctx.dismantle!('furnace-1')).toBe(true)
    expect(ctx.inspect!('furnace-1')).toBeUndefined()
    expect(c.economy.money).toBe(100)
  })
  for (const name of ['build', 'connect', 'dismantle', 'lastError'])
    expect(apiDeclarations(c)).toContain(name + '(')
})

test('the two blueprint stamps require a furnace placed by code and a belt connected to it by code', () => {
  const c = createCampaign()
  const first = OBJECTIVES.findIndex((o) => o.id === 'code-furnace')
  expect(first).toBeGreaterThan(OBJECTIVES.findIndex((o) => o.id === 'binder'))
  c.progress.completedObjectives = OBJECTIVES.slice(0, first).map((o) => o.id)
  c.economy.research.push('blueprints')
  const manual = purchaseMachine(c, 'furnace', 'shed', 3, 0)!
  advanceGame(c, (ctx) => expect(ctx.connect!(manual.id, 'dock')).toBe(true))
  expect(objectiveTrack(c).active?.id).toBe('code-furnace')
  let oven = ''
  advanceGame(c, (ctx) => {
    oven = ctx.build!('furnace', 6, 1)!
  })
  expect(objectiveTrack(c).active?.id).toBe('code-belt')
  expect(purchaseBelt(c, oven, 'dock')).toBeDefined()
  const saved = loadSave(serializeSave(c))
  advanceGame(saved, () => {})
  expect(objectiveTrack(saved).active?.id).toBe('code-belt')
  expect(sellBelt(saved, oven, 'dock')).toBe(true)
  const tick = advanceGame(saved, (ctx) => expect(ctx.connect!(oven, 'dock')).toBe(true))
  expect(tick.completed).toEqual(['code-belt'])
})

test('failed blueprints leave the floor and purse intact and report the shop restriction', () => {
  const c = createCampaign()
  c.economy.research.push('blueprints')
  advanceGame(c, (ctx) => {
    expect(ctx.build!('sorter', 2, 0)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/research/i)
    expect(ctx.build!('miner', 1, 4, { deposit: 'coal' })).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/stamping/i)
    expect(ctx.build!('miner', 1, 4, { deposit: 'iron' })).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/deposit/i)
    expect(ctx.build!('furnace', 2, 0, { recipe: 'motor' })).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/recipe/i)
    expect(ctx.build!('furnace', 2, 0)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/limit/i)
  })
  advanceGame(c, (ctx) => {
    expect(ctx.lastError!()).toBeUndefined()
    expect(ctx.build!('dock', 0, 0, { siteId: 'yard' })).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/road/i)
    expect(ctx.build!('dock', 8, 0)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/owned/i)
    expect(ctx.build!('miner', 3, 0)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/deposit/i)
    expect(ctx.build!('furnace', 4, 2)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/occupied/i)
  })
  expect(c.economy.money).toBe(100)
  c.economy.money = 0
  advanceGame(c, (ctx) => {
    expect(ctx.build!('furnace', 4, 0)).toBeUndefined()
    expect(ctx.lastError!()).toMatch(/coins/i)
    expect(ctx.connect!('furnace-a', 'dock')).toBe(false)
    expect(ctx.lastError!()).toMatch(/coins/i)
  })
  expect(c.world.machines.map((m) => m.id)).toEqual(['mine', 'furnace-a', 'dock'])
  expect(c.world.nextMachineId).toBe(1)
  expect(c.economy.money).toBe(0)
})

test('a saved blueprint replays the same IDs, belt path and refund on the next tick', () => {
  const c = createCampaign(42)
  c.economy.research.push('blueprints')
  const start = serializeSave(c)
  function build(game: typeof c) {
    advanceGame(game, (ctx) => {
      const oven = ctx.build!('furnace', 5, 1, { recipe: 'copper-ingot' })!
      expect(ctx.connect!(oven, 'dock')).toBe(true)
      expect(ctx.connect!(oven, 'dock')).toBe(false)
      expect(ctx.lastError!()).toMatch(/use/i)
      game.memory.oven = oven
    })
  }
  build(c)
  const replay = loadSave(start)
  build(replay)
  expect(serializeSave(replay)).toBe(serializeSave(c))
  expect(c.economy.money).toBe(68)
  expect(c.world.belts.at(-1)?.path).toEqual([
    { x: 5, y: 1 },
    { x: 6, y: 1 },
    { x: 7, y: 1 },
    { x: 7, y: 2 },
  ])
  const resumed = loadSave(serializeSave(c))
  expect(resumed).toEqual(c)
  for (const game of [c, resumed]) {
    advanceGame(game, (ctx) => {
      expect(ctx.dismantle!(String(game.memory.oven))).toBe(true)
      expect(ctx.dismantle!(String(game.memory.oven))).toBe(false)
      expect(ctx.build!('furnace', 5, 1)).toBe('furnace-2')
      expect(ctx.lastError!()).toBeUndefined()
    })
    expect(game.economy.money).toBe(76)
  }
  expect(serializeSave(resumed)).toBe(serializeSave(c))
})
