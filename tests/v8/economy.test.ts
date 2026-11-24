import { expect, test } from 'vitest'
import { createWorld, kettlewick, migrateWorld } from '../../packages/sim/src/v8'
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
    expect(session.world.orders[0]).toMatchObject({ shipped: 1, status: 'open' })
    expect(session.world.depot.ingots).toBe(0)
    expect(session.world.furnace.output).toBe(8)
    expect(session.world.ledger.income).toBe(0)
    expect(session.world.credits).toBe(kettlewick.credits)
    session.world.depot.ingots = 5
    session.step(1)
    expect(session.world.orders[0]).toMatchObject({ shipped: 2, status: 'ready' })
    expect(session.world.depot.ingots).toBe(4)
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
