import { expect, test } from 'vitest'
import { advanceGame, createCampaign } from '@inherit/sim'
import { createProgram } from './index'

test('QuickJS can declare and inspect the same named floor every tick', async () => {
  const c = createCampaign()
  const program = await createProgram(`export function onTick(ctx) {
    memory.oven = ctx.build("furnace",{name:"oven",x:2,y:1,recipe:"copper-ingot"})
    ctx.connect("mine","oven")
    memory.orders = ctx.orders()
    memory.locked = ctx.build("press") ?? ctx.lastError()
    memory.didRepair = ctx.repair("oven")
    memory.didClear = ctx.clear("oven")
    memory.freight = typeof ctx.dispatch
  }`)
  try {
    for (let i = 0; i < 4; i++) advanceGame(c, program)
    expect(c.memory).toMatchObject({
      oven: 'oven',
      orders: [],
      locked: expect.stringContaining('locked'),
      didClear: false,
      didRepair: false,
      freight: 'undefined',
    })
    expect(c.world.machines.at(-1)).toMatchObject({ id: 'oven', x: 2, y: 1, recipe: 'copper-ingot' })
    expect(c.economy.money).toBe(76)
    expect(c.world.belts).toHaveLength(1)
  } finally {
    program.dispose()
  }
})

test('the mine drops its first rock, waits on a full belt, then supplies Bram', async () => {
  const c = createCampaign()
  const program = await createProgram(`
    import { mine, furnace, cart } from "inherit"
    export function onTick(ctx) {
      if (ctx.tick > 1) mine.connect(furnace)
      mine.dig()
      if (ctx.tick > 60) {
        furnace.smelt()
        furnace.connect(cart.name)
      }
    }`)
  try {
    advanceGame(c, program)
    expect(c.world.extracted['iron-ore']).toBe(1)
    expect(c.world.lost).toBe(1)
    for (let i = 0; i < 90; i++) advanceGame(c, program)
    expect(c.world.lost).toBe(1)
    expect(c.town.beat).toBe(2)
    expect(c.world.belts).toHaveLength(2)
  } finally {
    program.dispose()
  }
})

test('a deployed ctx-style controller still receives the factory', async () => {
  const c = createCampaign()
  const program = await createProgram(`
    import type { Factory } from "inherit"
    export function onTick(ctx: Factory) {
      ctx.connect("mine", "furnace")
      ctx.dig("mine")
    }`)
  try {
    advanceGame(c, program)
    expect(c.world.extracted['iron-ore']).toBe(1)
  } finally {
    program.dispose()
  }
})
