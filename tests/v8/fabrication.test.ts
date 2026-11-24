import { expect, test } from 'vitest'
import { createSession } from '../../packages/sandbox/src/v8'
import { createWorld, kettlewick, migrateWorld, runTicks } from '../../packages/sim/src/v8'
import { dumpCargo, orderTransfer, stepDroneTasks } from '../../packages/sim/src/v8/modules/mining'
import { takeFromDepot } from '../../packages/sim/src/v8/modules/orders'
import { inspectMachine } from '../../packages/sim/src/v8/triggers'
import {
  createPress, hotFurnaceTicks, machineSlot, port, pressAt, pressRecipes, smeltRecipe, startRecipe,
} from '../../packages/sim/src/v8/modules/stock'
import { syncPress } from '../../packages/sim/src/v8/quests'
import { players } from '../../sim/policy'

function tick(world: ReturnType<typeof createWorld>, count = 1) {
  for (let i = 0; i < count; i++) {
    world.tick++
    stepDroneTasks(world, kettlewick, 0)
    takeFromDepot(world, kettlewick)
  }
}

test('a station holds any good, and the furnace fields stay the ore and ingot counts', () => {
  const world = createWorld(kettlewick)
  world.press = createPress()
  const press = port(world, 'press')!
  press.add('steel', 2)
  press.add('ingot', 1)
  press.add('grate', 1)
  expect(press.get('steel')).toBe(2)
  expect(press.get('ingot')).toBe(1)
  expect(press.get('grate')).toBe(1)
  const depot = port(world, 'depot')!
  depot.add('grate', 4)
  depot.add('ingot', 2)
  expect(world.depot.ingots).toBe(2)
  expect(depot.get('grate')).toBe(4)
  world.furnace.input = 3
  expect(port(world, 'furnace')!.get('ore')).toBe(3)
})

test('transfer reserves the cargo and the receiving space, and a cancel releases both', () => {
  const world = createWorld(kettlewick)
  world.press = createPress()
  world.drones.push({
    name: 'drone-2', pos: { ...world.depot.pos }, cargo: 0, capacity: 3, carrying: null, source: '', dig: null, task: null,
  })
  port(world, 'press')!.add('steel', 1)
  expect(orderTransfer(world, 'drone-1', 'steel', pressAt, world.depot.pos, 1, world.tick)).toBe('started')
  const press = port(world, 'press')!
  const depot = port(world, 'depot')!
  expect(press.free('steel')).toBe(0)
  expect(press.bin.reservedOut.steel).toBe(1)
  expect(depot.bin.reservedIn.steel).toBe(1)
  expect(() => orderTransfer(world, 'drone-2', 'steel', pressAt, world.depot.pos, 1, world.tick)).toThrow(/1 steel free|0 steel free/)
  dumpCargo(world, 'drone-1')
  expect(press.free('steel')).toBe(1)
  expect(press.bin.reservedOut.steel).toBeUndefined()
  expect(depot.bin.reservedIn.steel).toBeUndefined()
  expect(orderTransfer(world, 'drone-2', 'steel', pressAt, world.depot.pos, 1, world.tick)).toBe('started')
})

test('a saved haul keeps its reservation', () => {
  const world = createWorld(kettlewick)
  world.cleared = ['odile']
  world.press = createPress()
  port(world, 'press')!.add('plate', 1)
  orderTransfer(world, 'drone-1', 'plate', pressAt, world.depot.pos, 1, world.tick)
  const loaded = migrateWorld(structuredClone(world))
  expect(port(loaded, 'press')!.free('plate')).toBe(0)
  expect(() => orderTransfer(loaded, 'drone-1', 'plate', pressAt, kettlewick.depot.pos, 1, loaded.tick)).not.toThrow()
  loaded.drones.push({
    name: 'drone-2', pos: { x: 0, y: 0 }, cargo: 0, capacity: 3, carrying: null, source: '', dig: null, task: null,
  })
  expect(() => orderTransfer(loaded, 'drone-2', 'plate', pressAt, kettlewick.depot.pos, 1, loaded.tick)).toThrow(/free/)
})

test('start(recipe) consumes inputs, reserves the output, and finishes on its own ticks', () => {
  const world = createWorld(kettlewick)
  world.questId = 'elsie'
  world.press = createPress()
  const press = port(world, 'press')!
  press.add('steel', 2)
  expect(startRecipe(world, 'press', 'grate')).toBe('started')
  expect(press.get('steel')).toBe(0)
  expect(press.bin.reservedIn.grate).toBe(1)
  expect(world.press?.readyAt).toBe(smeltRecipe.ticks)
  expect(startRecipe(world, 'press', 'grate')).toBe('busy')
  runTicks(world, kettlewick, smeltRecipe.ticks, () => ({ used: 0 }))
  expect(press.get('grate')).toBe(1)
  expect(press.bin.reservedIn.grate).toBeUndefined()
  press.add('steel', 1)
  expect(startRecipe(world, 'press', 'grate')).toBe('short')
  expect(press.get('steel')).toBe(1)
  press.add('grate', machineSlot - 1)
  press.add('steel', 2)
  expect(startRecipe(world, 'press', 'grate')).toBe('full')
  expect(press.get('steel')).toBe(3)
})

test('smelt and alloy wrap start, and only a depot receipt counts', async () => {
  const session = await createSession(kettlewick, {
    'main.ts': `import { furnace } from "inherit"
export function onTick() { furnace.start("smelt") }`,
  }, undefined, { fresh: true })
  try {
    session.world.automation.tick = true
    session.world.loop = true
    session.world.furnace.input = 2
    session.step(1)
    expect(session.world.furnace.input).toBe(0)
    expect(session.world.furnace.readyAt).toBe(session.world.tick + smeltRecipe.ticks)
    session.step(smeltRecipe.ticks - 1)
    expect(session.world.furnace.output).toBe(0)
    session.step(1)
    expect(session.world.furnace.output).toBe(1)
    session.world.batchTicks = hotFurnaceTicks
    session.world.furnace.input = 2
    session.world.furnace.output = 0
    session.world.furnace.readyAt = null
    const started = session.world.tick
    session.step(1)
    expect(session.world.furnace.readyAt).toBe(started + 1 + hotFurnaceTicks)
    session.world.furnace.output = 6
    session.world.furnace.input = 2
    session.world.furnace.readyAt = null
    session.step(1)
    expect(session.world.furnace.input).toBe(2)
    expect(session.world.messages.some(message => message.text.includes('furnace output is full (6)'))).toBe(true)

    const world = session.world
    world.press = createPress()
    world.questId = 'bram'
    world.orders.push({
      id: 'bram', at: 0, item: 'ingot', qty: 2, pay: 80, from: 'Bram', who: 'bram', role: 'Blacksmith',
      title: 'Horseshoes', text: 'Ingots.', building: 'forge', change: 'Lit.', shipped: 0, status: 'open',
    })
    port(world, 'press')!.add('grate', 1)
    world.drones[0]!.pos = { ...pressAt }
    world.drones[0]!.task = null
    orderTransfer(world, 'drone-1', 'grate', pressAt, world.depot.pos, 1, world.tick)
    tick(world, 8)
    expect(port(world, 'depot')!.get('grate')).toBe(1)
    expect(world.orders[0]?.shipped).toBe(0)
    world.furnace.output = 2
    world.drones[0]!.pos = { ...world.furnace.pos }
    world.drones[0]!.task = null
    world.drones[0]!.cargo = 0
    world.drones[0]!.carrying = null
    orderTransfer(world, 'drone-1', 'ingot', world.furnace.pos, world.depot.pos, 2, world.tick)
    tick(world, 6)
    expect(world.orders[0]?.shipped).toBe(2)
  } finally { session.dispose() }
})

test('the press inspector names the recipe, the missing input, and the reserved load', () => {
  const world = createWorld(kettlewick)
  world.press = createPress()
  port(world, 'press')!.add('steel', 1)
  orderTransfer(world, 'drone-1', 'steel', pressAt, world.depot.pos, 1, world.tick)
  const view = inspectMachine(world, kettlewick, 'press')
  expect(view?.lines.find(line => line.label === 'Recipe')?.value).toBe('Idle')
  expect(view?.recipes.map(recipe => recipe.id)).toEqual(pressRecipes.map(recipe => recipe.id))
  expect(view?.recipes.find(recipe => recipe.id === 'grate')?.missing).toBe('2 steel')
  expect(view?.lines.find(line => line.label === 'Reserved')?.value).toContain('1 steel out')
  const drone = inspectMachine(world, kettlewick, 'drone-1')
  expect(drone?.lines.find(line => line.label === 'Reserved')?.value).toBe('1 steel')
})

test('old saves map the press to Odile and leave a bought drone without one', () => {
  const handed = createWorld(kettlewick)
  handed.cleared = ['bram', 'ines', 'odile']
  delete (handed.furnace as { bin?: unknown }).bin
  delete (handed.depot as { bin?: unknown }).bin
  handed.press = null
  const restored = migrateWorld(handed)
  expect(restored.press?.pos).toEqual(pressAt)
  expect(handed.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
  handed.furnace.input = 2
  expect(startRecipe(handed, 'furnace', 'smelt')).toBe('started')
  expect(handed.furnace.input).toBe(0)

  const bought = createWorld(kettlewick)
  bought.bought = ['drone']
  bought.press = createPress()
  port(bought, 'press')!.add('steel', 3)
  migrateWorld(bought)
  expect(bought.press).toBeNull()
  expect(bought.drones.map(drone => drone.name)).toContain('drone-2')

  const fresh = createWorld(kettlewick)
  expect(fresh.press).toBeNull()
  fresh.cleared = ['odile']
  syncPress(fresh)
  expect(fresh.press?.pos).toEqual({ x: 5, y: 1 })
})

test('the press line carries steel onto the press and a grate into the depot', async () => {
  const session = await createSession(kettlewick, players['press-line'], undefined, { fresh: true })
  try {
    session.world.cleared = ['bram', 'ines', 'odile']
    session.world.questId = 'elsie'
    syncPress(session.world)
    session.world.furnace.steel = 2
    session.world.drones[0]!.pos = { ...session.world.furnace.pos }
    session.setLoop(true)
    session.step(24)
    expect(session.world.console.filter(line => line.level === 'error')).toEqual([])
    expect(port(session.world, 'depot')!.get('grate')).toBe(1)
    expect(session.world.orders.every(order => order.shipped === 0)).toBe(true)
  } finally { session.dispose() }
})
