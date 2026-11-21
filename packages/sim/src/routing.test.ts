import { expect, test } from 'vitest'
import {
  buyPlot,
  cloneCampaign,
  connectBelt,
  createCampaign,
  loadSave,
  placeMachine,
  removeBelt,
  removeMachine,
  serializeSave,
  step,
  type CampaignFactory,
} from './index'

test('a seeded sorter sends rejects through scrap and keeps quality intact through storage and a merger', () => {
  const c = createCampaign(13)
  c.world.defectsEnabled = true
  removeBelt(c, 'mine', 'furnace')
  removeBelt(c, 'furnace', 'cart')
  placeMachine(c, 'sorter', 'shed', 2, 2, 'sort')
  placeMachine(c, 'scrap', 'shed', 3, 1, 'scrap')
  placeMachine(c, 'storage', 'shed', 3, 3, 'bin')
  placeMachine(c, 'merger', 'shed', 5, 2, 'join')
  for (const [a, b] of [
    ['mine', 'sort'],
    ['sort', 'scrap'],
    ['sort', 'bin'],
    ['scrap', 'join'],
    ['bin', 'join'],
    ['join', 'cart'],
  ])
    expect(connectBelt(c, a, b)).toBeTruthy()
  const controller = (ctx: CampaignFactory) => {
    if (ctx.tick <= 60 && ctx.space('mine')) ctx.dig('mine')
    ctx.route('sort', ctx.peek('sort')?.defect ? 'scrap' : 'bin')
    ctx.work('scrap', 'recycle')
    ctx.route('bin', 'join')
    ctx.route('join', 'cart')
  }
  for (let i = 0; i < 30; i++) step(c.world, controller)
  const replay = loadSave(serializeSave(c))
  const preview = cloneCampaign(c)
  let shipped = 0
  for (let i = 0; i < 150; i++) {
    for (const run of [c, replay]) step(run.world, controller)
    for (const e of c.world.lastEvents)
      if (e.type === 'delivered') {
        expect(e.item.defect).toBeUndefined()
        shipped++
      }
  }
  expect(shipped).toBeGreaterThan(0)
  expect(c.world.delivered['iron-ore']).toBe(c.world.extracted['iron-ore'])
  expect(c.world.machines.find((m) => m.id === 'scrap')?.stats.processed).toBeGreaterThan(0)
  expect(c).toEqual(replay)
  expect(preview.world.tick).toBe(30)
})
test('build costs, owned paths, deposit placement and refunds survive a live expansion', () => {
  const c = createCampaign()
  connectBelt(c, 'mine', 'furnace')
  step(c.world, (ctx) => ctx.dig('mine'))
  c.economy.money = 100
  const parcel = structuredClone(c.world.belts[0].items)
  expect(placeMachine(c, 'miner', 'shed', 9, 2, 'copper')).toBeUndefined()
  expect(buyPlot(c, 'shed', 'rail-spur')).toBe(false)
  expect(buyPlot(c, 'shed', 'east-lot')).toBe(true)
  expect(buyPlot(c, 'shed', 'east-lot')).toBe(false)
  expect(placeMachine(c, 'miner', 'shed', 8, 2)).toBeUndefined()
  const miner = placeMachine(c, 'miner', 'shed', 9, 2, 'copper', 12)!
  expect(miner.deposit).toBe('copper')
  expect(placeMachine(c, 'furnace', 'shed', 10, 2, 'oven', 9)).toBeUndefined()
  expect(placeMachine(c, 'furnace', 'shed', 10, 2, 'oven', 6)).toBeTruthy()
  expect(
    connectBelt(
      c,
      'copper',
      'oven',
      [
        { x: 9, y: 2 },
        { x: 9, y: 6 },
        { x: 10, y: 2 },
      ],
      2,
    ),
  ).toBeUndefined()
  expect(connectBelt(c, 'copper', 'oven', undefined, 2)).toBeTruthy()
  expect(c.economy.money).toBe(0)
  expect(removeMachine(c, 'oven')).toBe(true)
  expect(removeMachine(c, 'oven')).toBe(false)
  expect(removeMachine(c, 'copper')).toBe(true)
  expect(c.economy.money).toBe(20)
  expect(c.world.belts[0].items).toEqual(parcel)
  expect(c.world.tick).toBe(1)
})
test('code switches a furnace to copper and a cutter to wire without changing a running batch', () => {
  const c = createCampaign()
  c.economy.money = 100
  buyPlot(c, 'shed', 'east-lot')
  placeMachine(c, 'miner', 'shed', 9, 2, 'copper')
  placeMachine(c, 'furnace', 'shed', 10, 2, 'smelt')
  placeMachine(c, 'cutter', 'shed', 11, 2, 'draw')
  connectBelt(c, 'copper', 'smelt')
  connectBelt(c, 'smelt', 'draw')
  connectBelt(c, 'draw', 'cart')
  for (let i = 0; i < 45; i++)
    step(c.world, (ctx) => {
      if (ctx.tick === 1) ctx.dig('copper')
      expect(ctx.recipes('draw')).toContain('wire')
      expect(ctx.work('draw', 'motor')).toBe(false)
      ctx.work('smelt', 'copper-ingot')
      if (ctx.inspect('smelt')!.remaining) expect(ctx.work('smelt', 'iron-ingot')).toBe(false)
      ctx.work('draw', 'wire')
    })
  expect(c.world.delivered).toEqual({ wire: 1 })
})
test('a saturated merger shares its freed slots between both incoming belts', () => {
  const c = createCampaign()
  removeBelt(c, 'mine', 'furnace')
  placeMachine(c, 'miner', 'shed', 1, 4, 'coal')
  placeMachine(c, 'merger', 'shed', 2, 3, 'merge')
  connectBelt(c, 'mine', 'merge')
  connectBelt(c, 'coal', 'merge')
  connectBelt(c, 'merge', 'cart')
  for (let i = 0; i < 100; i++)
    step(c.world, (ctx) => {
      for (const id of ctx.machines('miner')) if (ctx.space(id)) ctx.dig(id)
      ctx.route('merge', 'cart')
    })
  expect(c.world.delivered['iron-ore']).toBeGreaterThan(35)
  expect(c.world.delivered.coal).toBeGreaterThan(35)
})
