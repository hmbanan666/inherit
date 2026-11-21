import { expect, test } from 'vitest'
import { connectBelt, placeMachine, removeBelt, createCampaign, step, type CampaignFactory } from './index'

test('the inherited belts fill the cold furnace, and a controller can ship the waiting ore', () => {
  const { world } = createCampaign(7)
  const dig = (ctx: CampaignFactory) => {
    if (ctx.space('mine')) ctx.dig('mine')
  }
  for (let i = 0; i < 30; i++) step(world, dig)
  const furnace = world.machines.find((m) => m.id === 'furnace-a')!
  expect(furnace.queue[0]).toEqual({ kind: 'iron-ore' })
  expect(furnace.status).toBe('ready')
  expect(world.delivered).toEqual({})
  for (let i = 0; i < 24; i++) step(world, (ctx) => ctx.work('furnace-a'))
  expect(world.delivered['iron-ingot']).toBeGreaterThan(0)
  expect(furnace.stats.activeTicks).toBeGreaterThan(0)
})

test('a retry after breakdown and lost acknowledgement consumes and delivers exactly one parcel', () => {
  const c = createCampaign()
  removeBelt(c, 'mine', 'furnace-a')
  placeMachine(c, 'depot', 'shed', 2, 2, 'local')
  placeMachine(c, 'truck', 'shed', 2, 3, 'lorry')
  placeMachine(c, 'depot', 'yard', 0, 1, 'remote')
  connectBelt(c, 'mine', 'local')
  const outcomes: string[] = []
  for (let i = 0; i < 50; i++)
    step(c.world, (ctx, events) => {
      if (ctx.tick === 1) ctx.dig('mine')
      ctx.dispatch('lorry', 'local', 'remote', 'manifest-1')
      for (const e of events) if (e.type === 'truckReturned') outcomes.push(e.outcome)
    })
  expect(outcomes).toEqual(['breakdown', 'lostAck', 'ok'])
  expect(c.world.machines.find((m) => m.id === 'remote')?.queue).toEqual([{ kind: 'iron-ore' }])
  expect(c.world.receipts).toHaveLength(1)
  expect(c.world.incidents.map((i) => i.cause)).toEqual(['breakdown', 'lostAck'])
  expect(c.world.incidents.every((i) => i.endTick !== undefined)).toBe(true)
})

test('a controller can inspect ingredient counts without editing the catalog or factory', () => {
  const { world } = createCampaign()
  step(world, (ctx) => {
    const motor = ctx.recipe('motor')!
    expect(motor.inputs).toEqual({ gear: 1, wire: 2, bracket: 1 })
    motor.inputs.wire = 0
    expect(ctx.recipe('motor')?.inputs.wire).toBe(2)
    ctx.inspect('mine')!.stats.processed = 200
    expect(ctx.inspect('mine')?.stats.processed).toBe(0)
  })
})

test('backpressure keeps bounded incident history during long production runs', () => {
  const { world } = createCampaign()
  for (let i = 0; i < 1000; i++)
    step(world, (ctx) => {
      ctx.dig('mine')
      ctx.work('furnace-a')
    })
  expect(world.lost).toBeGreaterThan(128)
  expect(world.incidents.length).toBeLessThanOrEqual(129)
  expect(new Set(world.incidents.map((i) => i.id)).size).toBe(world.incidents.length)
})
