import { expect, test } from 'vitest'
import { kettlewick } from './sites/kettlewick'
import { acceptQuest, nextUnlock, questList } from './quests'
import { createWorld } from './core/world'
import { mining } from './modules/mining'
import { inspectAt, noteCheckReset, readChecks, stallTicks } from './checkFacts'
import { createSession } from '../../../sandbox/src/v8'

const solution = /\b(send|buy|shop|remember|should)\b/i

function bramWorld() {
  const world = createWorld(kettlewick)
  acceptQuest(world, kettlewick)
  return world
}

function afterStill(world: ReturnType<typeof bramWorld>, quest = questList[0]!) {
  readChecks(world, quest)
  world.tick += stallTicks
  return readChecks(world, quest)
}

test('a new quest stays pending until the works have been still', () => {
  const readings = readChecks(bramWorld(), questList[0]!)
  expect(readings.every(check => check.state === 'pending')).toBe(true)
  expect(readings.every(check => check.reason === undefined)).toBe(true)
  expect(readings.find(check => check.id === 'done')?.text).toBe('Bram receives 4 ingots 0/4')
})

test('the first stuck check names the blocking fact and the rest wait on it', () => {
  const world = bramWorld()
  const vein = world.veins.find(item => item.name === 'A')!
  const drone = world.drones[0]!
  drone.pos = { ...vein.pos }
  drone.cargo = drone.capacity
  const readings = afterStill(world)
  const ore = readings.find(check => check.id === 'ore')
  expect(ore?.state).toBe('failed')
  expect(ore?.reason).toBe('drone-1 is full (3/3) at Vein A and not moving')
  for (const check of readings.filter(item => item.id !== 'ore')) {
    expect(check.state).toBe('failed')
    expect(check.reason).toBe('waits on: Ore reaches the furnace')
  }
  for (const check of readings) expect(check.reason ?? '').not.toMatch(solution)
})

test('an empty furnace is the ore fact only after the same still stretch, and it is not copied', () => {
  const readings = afterStill(bramWorld())
  expect(readings.find(check => check.id === 'ore')?.reason).toBe('furnace input 0')
  expect(readings.filter(check => check.reason === 'furnace input 0')).toHaveLength(1)
  expect(readings.find(check => check.id === 'ingot')?.reason).toBe('waits on: Ore reaches the furnace')
})

test('motion after a deploy keeps the check pending', () => {
  const world = bramWorld()
  world.tick = 30
  noteCheckReset(world)
  const drone = world.drones[0]!
  readChecks(world, questList[0]!)
  world.tick += 5
  drone.pos = { x: drone.pos.x + 1, y: drone.pos.y }
  const moved = readChecks(world, questList[0]!)
  expect(moved.every(check => check.state === 'pending')).toBe(true)
  world.tick += stallTicks
  const stuck = readChecks(world, questList[0]!)
  expect(stuck.find(check => check.id === 'ore')?.state).toBe('failed')
})

test('counts advance and a passing check has no reason', () => {
  const world = bramWorld()
  world.furnace.input = 2
  world.furnace.output = 1
  world.ingotsMade = 4
  const order = world.orders.find(item => item.id === 'bram')!
  order.shipped = 2
  const midway = afterStill(world).find(check => check.id === 'done')
  expect(midway?.text).toBe('Bram receives 4 ingots 2/4')
  expect(midway?.state).toBe('failed')
  expect(midway?.reason).toBe('shipped 2/4')
  order.shipped = 4
  const done = readChecks(world, questList[0]!)
  expect(done.every(check => check.state === 'passing')).toBe(true)
  expect(done.every(check => check.reason === undefined)).toBe(true)
})

test('a route check stays pending until the window is full and the count has sat still', () => {
  const earlyWorld = createWorld(kettlewick)
  earlyWorld.pathWindow = [1, 1, 1]
  const early = readChecks(earlyWorld, questList[5]!).find(check => check.id === 'memory')
  expect(early?.text).toBe('The route is remembered 3/8')
  expect(early?.state).toBe('pending')
  const lateWorld = createWorld(kettlewick)
  lateWorld.pathWindow = [1, 1, 1, 1, 1, 1, 1, 1]
  const late = afterStill(lateWorld, questList[5]!).find(check => check.id === 'memory')
  expect(late?.state).toBe('failed')
  expect(late?.reason).toBe('path calls 8')
  expect(readChecks(lateWorld, questList[5]!).find(check => check.id === 'done')?.reason).toBe('waits on: The route is remembered')
})

test('the next shop tier is the one above this level', () => {
  expect(nextUnlock(1)?.level).toBe(2)
  expect(nextUnlock(1)?.items).toEqual(['Alloy'])
  expect(nextUnlock(6)).toBeUndefined()
})

test('a click reads the fields on that cell', () => {
  const world = bramWorld()
  const drone = world.drones[0]!
  drone.pos = { x: 6, y: 2 }
  drone.cargo = 3
  expect(inspectAt(world, 6, 2)).toEqual({ id: 'drone-1', fields: ['pos 6,2', 'cargo 3/3'] })
  expect(inspectAt(world, 2, 1)?.fields).toContain('input 0')
  expect(inspectAt(world, 1, 1)?.id).toBe('depot')
})

test('the starter program leaves a full cart beside Vein A, and that fact wins', async () => {
  const session = await createSession(kettlewick)
  try {
    session.accept()
    session.step(40)
    const drone = session.world.drones[0]!
    const vein = session.world.veins.find(item => item.name === 'A')!
    const away = Math.abs(drone.pos.x - vein.pos.x) + Math.abs(drone.pos.y - vein.pos.y)
    expect(drone.cargo).toBe(3)
    expect(drone.capacity).toBe(3)
    expect(away).toBe(1)
    expect(drone.pos).not.toEqual(vein.pos)
    expect(session.world.furnace.input).toBe(0)
    const readings = readChecks(session.world, questList[0]!)
    expect(readings.find(check => check.id === 'ore')?.reason).toBe('drone-1 is full (3/3) at Vein A and not moving')
    expect(readings.find(check => check.id === 'ingot')?.reason).toBe('waits on: Ore reaches the furnace')
  } finally {
    session.dispose()
  }
})

test('a step keeps the rest of the route so the map can draw it', () => {
  const world = createWorld(kettlewick)
  const drone = world.drones[0]!
  const move = mining(kettlewick).find(brick => brick.name === 'drone.moveAlong')
  if (!move || typeof move.handler !== 'function') throw new Error('moveAlong')
  const start = { ...drone.pos }
  move.handler({ world, cpuUsed: () => 0 }, drone.name, [
    { x: start.x + 1, y: start.y },
    { x: start.x + 3, y: start.y },
  ])
  expect(drone.pos).toEqual({ x: start.x + 1, y: start.y })
  expect(drone.route?.length).toBeGreaterThan(1)
})
