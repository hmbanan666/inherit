import { expect, test } from 'vitest'
import { completeQuest, createWorld, kettlewick, migrateWorld, questList, shop, shopFor } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'

test('a nearby drone supplies the furnace and one batch finishes four ticks after ignition', async () => {
  const session = await createSession(kettlewick, { 'main.ts': `import { drones, furnace, memory, tick } from "inherit"
    export function onTick() {
      if (tick === 1) drones()[0].unload(furnace)
      furnace.smelt()
      memory.stock = [furnace.input, furnace.output]
    }` })
  try {
    Object.assign(session.world.drones[0], { pos: { ...kettlewick.furnace.pos }, cargo: 2 })
    session.step(4)
    expect(session.world.memory.stock).toEqual([0, 0])
    session.step(1)
    expect(session.world.memory.stock).toEqual([0, 1])
    expect(session.world.credits).toBe(kettlewick.credits)
  } finally { session.dispose() }
})

test('the depot fills the open quest and does not pay until hand over', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { orders, ship } from "inherit"
export function onTick() { for (const order of orders()) ship(order) }`,
  })
  try {
    expect(session.accept()).toBe(true)
    session.world.depot.ingots = 1
    session.world.furnace.output = 8
    session.step(1)
    expect(session.world.orders[0]).toMatchObject({ shipped: 1, status: 'ready' })
    expect(session.world.depot.ingots).toBe(0)
    expect(session.world.furnace.output).toBe(8)
    expect(session.world.ledger.income).toBe(0)
    expect(session.world.credits).toBe(kettlewick.credits)
    session.world.depot.ingots = 5
    session.step(1)
    expect(session.world.orders[0]).toMatchObject({ shipped: 1, status: 'ready' })
    expect(session.world.depot.ingots).toBe(5)
    expect(session.world.credits).toBe(kettlewick.credits)
    expect(session.world.messages).toEqual([])
  } finally { session.dispose() }
})

test('an empty furnace does not spend credits', async () => {
  const session = await createSession(kettlewick, { 'main.ts': 'import { furnace } from "inherit"; export function onTick() { furnace.smelt() }' })
  try {
    session.world.credits = 0
    session.step(20)
    expect(session.world.tick).toBe(20)
    expect(session.world.credits).toBe(0)
    expect(session.world.ledger).toEqual({ income: 0 })
  } finally { session.dispose() }
})

test('an old save keeps its credits, drops waste and due, and gains drone-2 after Odile', () => {
  const world = createWorld(kettlewick)
  world.veins = world.veins.filter(vein => vein.name !== 'D')
  world.credits = 140
  world.ledger = { income: 80, waste: 4 } as typeof world.ledger
  world.cleared = ['bram', 'ines', 'odile']
  world.bought = ['cart']
  world.orders = [{
    id: 'odile', at: 1, item: 'steel', qty: 4, pay: 100, from: 'Mayor Odile', who: 'odile',
    role: 'Mayor', title: 'Steel for the bridge', text: 'Steel.', building: 'bridge',
    change: 'The bridge stands.', shipped: 4, status: 'on time', due: 99999,
  } as typeof world.orders[number]]
  ;(world as { holdTicks?: number }).holdTicks = 48
  ;(world as { coalHold?: number }).coalHold = 24
  migrateWorld(world)
  expect(world.credits).toBe(140)
  expect(world.ledger).toEqual({ income: 80 })
  expect('waste' in world.ledger).toBe(false)
  expect('due' in (world.orders[0] ?? {})).toBe(false)
  expect('holdTicks' in world).toBe(false)
  expect('coalHold' in world).toBe(false)
  expect(world.veins.filter(vein => vein.kind === 'ore').map(vein => vein.name)).toEqual(['A', 'D', 'C'])
  expect(world.veins.find(vein => vein.name === 'A')?.pos).toEqual({ x: 6, y: 2 })
  expect(world.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
  expect(world.drones[1]?.pos).toEqual(world.depot.pos)
  migrateWorld(world)
  expect(world.drones.filter(drone => drone.name === 'drone-2')).toHaveLength(1)
  expect(world.credits).toBe(140)
})

test('an open order from the previous contract still hands over', () => {
  const world = createWorld(kettlewick)
  world.credits = 140
  world.xp = 20
  world.level = 2
  world.questId = 'bram'
  world.codedBatch = false
  world.orders = [{
    id: 'bram', at: 1, item: 'ingot', qty: 2, pay: 80, from: 'Bram', who: 'bram',
    role: 'Blacksmith', title: 'Horseshoes for the mail horse', text: 'Two ingots.',
    building: 'forge', change: 'The forge is lit.', shipped: 2, status: 'open',
  }]
  migrateWorld(world)
  expect(world.credits).toBe(140)
  expect(world.xp).toBe(20)
  expect(world.level).toBe(2)
  expect(completeQuest(world, kettlewick)).toBe(true)
  expect(world.credits).toBe(180)
  expect(world.xp).toBe(30)
  expect(world.level).toBe(3)
})

test('the opening purse buys nothing, and racks wait for the press', () => {
  expect(kettlewick.credits).toBe(80)
  expect(shop.map(item => [item.id, item.price])).toEqual([
    ['cart', 150], ['hopper', 240], ['furnace', 350], ['racks', 450], ['cpu', 580], ['spare', 720],
  ])
  const world = createWorld(kettlewick)
  expect(shopFor(world).map(item => item.id)).toEqual(['cart', 'hopper', 'furnace', 'cpu'])
  expect(shopFor(world).every(item => item.price > world.credits)).toBe(true)
  world.credits = 180
  expect(shopFor(world).some(item => item.id === 'cart' && item.price <= world.credits)).toBe(true)
  world.cleared = ['bram', 'ines', 'odile']
  expect(shopFor(world).map(item => item.id)).toEqual(['cart', 'hopper', 'furnace', 'racks', 'cpu', 'spare'])
  const pays = questList.map(quest => quest.pay)
  expect(pays).toEqual([40, 60, 80, 100, 110, 130, 150, 170])
})
