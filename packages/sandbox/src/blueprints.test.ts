import { expect, test } from 'vitest'
import { advanceGame, createCampaign } from '@inherit/sim'
import { createProgram } from './index'

test('player code can buy, wire and refund a configured furnace within its call budget', async () => {
  const c = createCampaign()
  const program = await createProgram(`export function onTick(ctx) {
    memory.licensed = typeof ctx.build === "function";
    if (!memory.licensed) return;
    const oven = ctx.build("furnace", 1, 2, {siteId: "yard", recipe: "copper-ingot"});
    memory.recipe = ctx.inspect(oven).recipe;
    const dock = ctx.build("dock", 2, 2, {siteId: "yard"});
    memory.connected = ctx.connect(oven, dock);
    memory.refunded = ctx.dismantle(oven);
    memory.fifth = ctx.dismantle(dock);
    memory.reason = ctx.lastError();
  }`)
  try {
    advanceGame(c, program)
    expect(c.memory).toEqual({ licensed: false })
    c.economy.research.push('bins', 'blueprints')
    c.economy.road = true
    advanceGame(c, program)
    expect(c.memory).toEqual({
      licensed: true,
      recipe: 'copper-ingot',
      connected: true,
      refunded: true,
      fifth: false,
      reason: expect.stringContaining('4'),
    })
    expect(program.stats.calls).toBe(7)
    expect(c.economy.money).toBe(84)
  } finally {
    program.dispose()
  }
})

test('event and tick handlers spend the same four attempts, including shop failures', async () => {
  const c = createCampaign()
  c.economy.research.push('blueprints', 'arrivals')
  c.world.lastEvents.push({ type: 'itemArrived', machineId: 'dock', tick: 0, item: { kind: 'coal' } })
  const program = await createProgram({
    unlockedEvents: ['onItemArrived'],
    files: {
      'main.ts': `
      export function onItemArrived(e, ctx) {
        for (let i = 0; i < 3; i++) ctx.build("dock", i, -1);
      }
      export function onTick(ctx) {
        ctx.dismantle("missing");
        memory.id = ctx.build("dock", 0, 0) ?? null;
        memory.error = ctx.lastError() ?? null;
      }`,
    },
  })
  try {
    advanceGame(c, program)
    expect(c.memory).toEqual({ id: null, error: expect.stringMatching(/limit/i) })
    advanceGame(c, program)
    expect(c.memory).toEqual({ id: 'dock-1', error: null })
  } finally {
    program.dispose()
  }
})

test('build coordinates reach the shop as numbers and each attempt costs one CPU call', async () => {
  const c = createCampaign()
  c.economy.research.push('blueprints')
  const program = await createProgram({
    budget: 3,
    files: {
      'main.ts': `
      export function onTick(ctx) {
        memory.tile = ctx.build("dock", NaN, 0) ?? null;
        memory.reason = ctx.lastError();
        memory.first = ctx.build("dock", 1, 0);
        ctx.build("dock", 2, 0);
      }`,
    },
  })
  try {
    expect(() => advanceGame(c, program)).toThrow(/budget/i)
    expect(c.memory).toEqual({ tile: null, reason: expect.stringMatching(/tile/i), first: 'dock-1' })
    expect(c.economy.money).toBe(84)
  } finally {
    program.dispose()
  }
})
