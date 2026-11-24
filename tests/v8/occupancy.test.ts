import { expect, test } from 'vitest'
import { createSession } from '../../packages/sandbox/src/v8'
import { apiBook, createWorld, factoryBricks, kettlewick, migrateWorld } from '../../packages/sim/src/v8'
import type { Cell, Drone, World } from '../../packages/sim/src/v8/core/world'
import { stepDroneTasks } from '../../packages/sim/src/v8/modules/mining'
import { cellOpen, claimCell, greedyStep, setWalkLimit, settleOccupancy, takeStep } from '../../packages/sim/src/v8/occupancy'

function unique(world: World) {
  const keys = world.drones.map(drone => `${drone.pos.x},${drone.pos.y}`)
  expect(new Set(keys).size).toBe(keys.length)
}

function addDrone(world: World, name: string, pos: Cell, extra: Partial<Drone> = {}) {
  world.drones.push({
    name, pos, cargo: 0, capacity: 3, carrying: null, source: '', dig: null, task: null, wait: null, avoid: null, waited: 0,
    ...extra,
  })
}

test('a head-on swap steps the lower drone id aside', () => {
  const world = createWorld(kettlewick)
  world.tick = 1
  const lower = world.drones[0]!
  lower.pos = { x: 4, y: 2 }
  lower.task = { kind: 'mine', vein: 'A', since: 0 }
  addDrone(world, 'drone-2', { x: 5, y: 2 }, {
    cargo: 1, carrying: 'ore', task: { kind: 'unload', at: 'depot', since: 0 },
  })
  stepDroneTasks(world, kettlewick, 0)
  unique(world)
  expect(lower.pos).toEqual({ x: 4, y: 1 })
  expect(world.drones[1]!.pos).toEqual({ x: 4, y: 2 })
})

test('a narrow corridor lets the carts pass without sharing a cell', () => {
  const world = createWorld(kettlewick)
  setWalkLimit(world, cell => (cell.y === 0 && cell.x >= 0 && cell.x <= 6) || (cell.x === 2 && cell.y === 1))
  const lower = world.drones[0]!
  lower.pos = { x: 2, y: 0 }
  addDrone(world, 'drone-2', { x: 3, y: 0 })
  const goals: Record<string, Cell> = { 'drone-1': { x: 5, y: 0 }, 'drone-2': { x: 0, y: 0 } }
  for (let tick = 0; tick < 24; tick++) {
    world.tick += 1
    for (const drone of world.drones) {
      const goal = goals[drone.name]!
      if (drone.pos.x === goal.x && drone.pos.y === goal.y) continue
      const next = greedyStep(world, drone.pos, goal)
      if (next) takeStep(world, drone, next, goal, 0, false)
    }
    settleOccupancy(world)
    unique(world)
  }
  expect(world.drones.map(drone => drone.pos)).toEqual([{ x: 5, y: 0 }, { x: 0, y: 0 }])
})

test('a furnace queue waits, logs once, and does not stack', () => {
  const world = createWorld(kettlewick)
  const parked = world.drones[0]!
  parked.pos = { x: 3, y: 1 }
  addDrone(world, 'drone-2', { x: 4, y: 1 }, {
    cargo: 1, carrying: 'ore', task: { kind: 'unload', at: 'furnace', since: 0 },
  })
  for (let tick = 0; tick < 8; tick++) {
    world.tick += 1
    stepDroneTasks(world, kettlewick, 0)
    unique(world)
    expect(world.drones[1]!.pos).not.toEqual(parked.pos)
    if (tick === 0) expect(world.drones[1]!.wait?.ticks).toBe(1)
  }
  const lines = world.console.filter(line => line.text.includes('waited')).map(line => line.text)
  expect(lines).toEqual(['drone-2 waited 3 ticks at the furnace'])
  expect(world.drones[1]!.waited).toBeGreaterThanOrEqual(3)
  const furnace = world.furnace.pos
  const arrived = world.drones[1]!
  expect(Math.abs(arrived.pos.x - furnace.x) + Math.abs(arrived.pos.y - furnace.y)).toBeLessThanOrEqual(1)
  expect(arrived.task).toBeNull()
})

test('a reserved cell stops an engine step and moveAlong may enter it', () => {
  const world = createWorld(kettlewick)
  world.tick = 1
  const drone = world.drones[0]!
  drone.pos = { x: 0, y: 1 }
  drone.cargo = 1
  drone.carrying = 'ore'
  drone.task = { kind: 'unload', at: 'furnace', since: 0 }
  expect(claimCell(world, { x: 1, y: 1 })).toBe(true)
  expect(cellOpen(world, { x: 1, y: 1 })).toBe(false)
  stepDroneTasks(world, kettlewick, 0)
  expect(drone.pos).toEqual({ x: 0, y: 1 })
  drone.task = null
  expect(takeStep(world, drone, { x: 1, y: 1 }, { x: 1, y: 1 }, 0, true)).toBe(true)
  expect(drone.pos).toEqual({ x: 1, y: 1 })
})

test('an old save separates stacked drones and fills the wait fields', () => {
  const world = createWorld(kettlewick)
  world.cleared = ['odile']
  addDrone(world, 'drone-2', { ...world.depot.pos })
  delete world.drones[0]!.wait
  delete world.drones[0]!.waited
  delete world.cellClaims
  migrateWorld(world)
  expect(world.drones.map(drone => drone.name)).toEqual(['drone-1', 'drone-2'])
  expect(world.drones[0]!.pos).toEqual(world.depot.pos)
  expect(world.drones[1]!.pos).not.toEqual(world.drones[0]!.pos)
  expect(world.drones[0]!.wait).toBeNull()
  expect(world.drones[0]!.waited).toBe(0)
  expect(world.drones[1]!.wait).toBeNull()
  expect(world.cellClaims).toEqual([])
  unique(world)
})

test('the book lists isFree and reserve, and findPath still walks through another drone', async () => {
  const world = createWorld(kettlewick)
  const ids = apiBook(factoryBricks(kettlewick), world).find(section => section.id === 'drone')?.entries.map(entry => entry.id)
  expect(ids).toContain('isFree')
  expect(ids).toContain('reserve')
  const session = await createSession(kettlewick, {
    'main.ts': `import { findPath, furnace, isFree, memory, reserve } from "inherit"
export function onTick() {
  memory.open = isFree(furnace.pos)
  memory.held = reserve(furnace.pos)
  memory.shut = isFree(furnace.pos)
  memory.path = findPath({ x: 1, y: 1 }, { x: 6, y: 2 })
}`,
  })
  try {
    addDrone(session.world, 'drone-2', { x: 3, y: 1 })
    session.step(1)
    expect(session.world.memory).toMatchObject({
      open: true,
      held: true,
      shut: false,
      path: [
        { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 5, y: 1 }, { x: 6, y: 1 }, { x: 6, y: 2 },
      ],
    })
  } finally { session.dispose() }
})
