import { expect, test } from 'vitest'
import {
  acceptOrder,
  advanceGame,
  apiDeclarations,
  createCampaign,
  declineOrder,
  deployGameProject,
  getSurface,
  loadSave,
  openBoard,
  questStatus,
  research,
  serializeSave,
} from './index'

test('the first board replays from a save and one parcel fills just one ticket', () => {
  const c = createCampaign(831)
  c.progress.completedObjectives.push('loading')
  openBoard(c)
  const saved = serializeSave(c)
  const replay = loadSave(saved)
  const first = c.economy.orders[0]
  expect(first.items).toEqual({ 'iron-ingot': 3 })
  expect(acceptOrder(c, first.id)).toBe(true)
  expect(acceptOrder(replay, first.id)).toBe(true)
  const run = (game: typeof c) => {
    for (let i = 0; i < 40; i++)
      advanceGame(game, (ctx) => {
        if (ctx.space('mine')) ctx.dig('mine')
        ctx.work('furnace-a')
      })
  }
  run(c)
  run(replay)
  expect(first.status).toBe('done')
  expect(c.economy.reputation).toBeGreaterThan(0)
  expect(serializeSave(c)).toBe(serializeSave(replay))
})

test('an engine v2 save retains the running floor, code, receipts and old order terms', () => {
  const old = JSON.parse(serializeSave(createCampaign(80)))
  old.version = 2
  old.progress = { completedQuests: ['shed'] }
  old.economy = {
    money: 27,
    reputation: 4,
    research: [],
    orders: [
      {
        id: 'ticket-2',
        customer: 'Ben',
        items: { wire: 2 },
        status: 'accepted',
        deadline: 80,
        pay: 15,
        reputation: 1,
      },
    ],
  }
  old.memory = { chalk: 7 }
  const c = loadSave(old)
  expect(c.version).toBe(3)
  expect(c.world).toEqual(old.world)
  expect(c.memory).toEqual(old.memory)
  expect(c.project).toEqual(old.project)
  expect(c.economy.orders[0]).toMatchObject({ id: 'ticket-2', deadline: 80, filled: {} })
  expect(loadSave(serializeSave(c))).toEqual(c)
})

test('an incident on the iron line names the ingot customer and leaves the wire customer off the record', () => {
  const c = createCampaign()
  c.progress.completedObjectives.push('loading')
  const [iron, wire] = openBoard(c)
  wire.items = { wire: 1 }
  acceptOrder(c, iron.id)
  acceptOrder(c, wire.id)
  for (let i = 0; i < 22; i++) advanceGame(c, (ctx) => ctx.dig('mine'))
  expect(c.world.incidents.find((i) => i.machineId === 'mine')?.affectedOrders).toEqual([iron.id])
})

test('only licensed calls, handlers, modules and operation budgets reach the player', () => {
  const c = createCampaign()
  c.project.working['lib/feed.ts'] = 'export const feed = 1'
  expect(() => deployGameProject(c)).toThrow(/binder/i)
  expect(apiDeclarations(c)).not.toMatch(/inspect\(|onItemArrived\?/)
  const early = getSurface(c)
  expect(early.events).toEqual([])
  expect(early.budget).toBe(96)
  for (let i = 0; i < 10; i++)
    advanceGame(c, (ctx, events) => {
      expect(Object.keys(ctx).sort()).toEqual([...early.methods, 'tick'].sort())
      expect(events).toEqual([])
      ctx.dig('mine')
    })
  c.economy.researchPoints = 20
  for (const id of ['bins', 'fork', 'binder', 'clock', 'arrivals']) expect(research(c, id)).toBe(true)
  const rp = c.economy.researchPoints
  expect(research(c, 'arrivals')).toBe(false)
  expect(c.economy.researchPoints).toBe(rp)
  expect(getSurface(c)).toMatchObject({ multiFile: true, budget: 192, events: ['onItemArrived'] })
  expect(apiDeclarations(c)).toMatch(/inspect\(/)
  expect(apiDeclarations(c)).not.toMatch(/dispatch\(/)
  expect(deployGameProject(c).files).toHaveProperty('lib/feed.ts')
})

test('decline, expiry and same-tick deliveries settle each parcel and reward once', () => {
  const c = createCampaign()
  c.progress.completedObjectives.push('loading')
  const [first, second, third] = openBoard(c)
  expect(declineOrder(c, third.id)).toBe(true)
  expect(acceptOrder(c, third.id)).toBe(false)
  expect(acceptOrder(c, first.id)).toBe(true)
  expect(acceptOrder(c, second.id)).toBe(true)
  const dock = c.world.machines.find((m) => m.kind === 'dock')!
  for (let i = 0; i < 3; i++) {
    dock.queue.push({ kind: 'iron-ingot' })
    const result = advanceGame(c, () => {})
    expect(result.orderUpdates.filter((o) => o.id === first.id)).toHaveLength(1)
    expect(second.filled).toEqual({})
  }
  expect(first.status).toBe('done')
  const paid = c.economy.money
  while (c.world.tick <= second.deadline!) advanceGame(c, () => {})
  expect(second.status).toBe('failed')
  expect(c.economy.reputation).toBe(0)
  expect(c.economy.money).toBe(paid)
  expect(advanceGame(c, () => {}).orderUpdates).toEqual([])
})

test('a controller error still settles the physical tick and its rewards exactly once', () => {
  const c = createCampaign()
  const tick = () =>
    advanceGame(c, (ctx) => {
      ctx.dig('mine')
      throw new Error('shed light flickered')
    })
  expect(tick).toThrow('shed light flickered')
  expect(c.progress.completedObjectives).toEqual(['dig'])
  expect(c.world.tick).toBe(1)
  const money = c.economy.money
  expect(tick).toThrow('shed light flickered')
  expect(c.economy.money).toBe(money)
})

test('a hosted program receives only its licensed bells and exports memory after the tick', () => {
  const c = createCampaign()
  const guestMemory = { rings: 0 }
  c.economy.research.push('arrivals')
  for (let t = 0; t < 12; t++)
    advanceGame(c, {
      onTick(ctx) {
        ctx.dig('mine')
      },
      deliverEvent(name, event) {
        expect(name).toBe('onItemArrived')
        expect(event.type).toBe('itemArrived')
        guestMemory.rings++
      },
      exportMemory() {
        return { ...guestMemory }
      },
    })
  expect(c.memory.rings).toBeGreaterThan(0)
})

test('a partially shipped engine customer keeps their counter when the tutorial reaches them', () => {
  const old = JSON.parse(serializeSave(createCampaign()))
  old.version = 2
  old.world.tick = 70
  old.world.extracted['iron-ore'] = 14
  old.world.delivered['iron-ingot'] = 6
  old.world.machines[1].stats.processed = 6
  old.progress.activeQuest.shipped = 2
  const c = loadSave(old)
  for (let i = 0; i < 3; i++) advanceGame(c, () => {})
  expect(questStatus(c)).toMatchObject({ id: 'shed', shipped: 4, elapsed: 70 })
})
