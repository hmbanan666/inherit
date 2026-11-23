import { expect, test } from 'vitest'
import { kettlewick } from './sites/kettlewick'
import { acceptQuest, nextUnlock, questList } from './quests'
import { createWorld } from './core/world'
import { inspectAt, readChecks } from './checkFacts'

const solution = /\b(send|buy|shop|remember|should)\b/i

function bramWorld() {
  const world = createWorld(kettlewick)
  acceptQuest(world, kettlewick)
  return world
}

test('a delivery check shows the live count and an empty furnace is a fact', () => {
  const readings = readChecks(bramWorld(), questList[0]!)
  const done = readings.find(check => check.id === 'done')
  expect(done?.text).toBe('Bram receives 4 ingots 0/4')
  expect(done?.state).toBe('failed')
  expect(done?.reason).toBe('furnace input 0')
  expect(readings.find(check => check.id === 'ore')?.reason).toBe('furnace input 0')
  for (const check of readings) expect(check.reason ?? '').not.toMatch(solution)
})

test('a full cart sitting on a vein is the stuck fact', () => {
  const world = bramWorld()
  const vein = world.veins.find(item => item.name === 'A')!
  const drone = world.drones[0]!
  drone.pos = { ...vein.pos }
  drone.cargo = drone.capacity
  const ore = readChecks(world, questList[0]!).find(check => check.id === 'ore')
  expect(ore?.state).toBe('failed')
  expect(ore?.reason).toBe('drone-1 is full at Vein A')
  expect(ore?.reason ?? '').not.toMatch(solution)
})

test('counts advance and a passing check has no reason', () => {
  const world = bramWorld()
  world.furnace.input = 2
  world.furnace.output = 1
  world.ingotsMade = 4
  const order = world.orders.find(item => item.id === 'bram')!
  order.shipped = 2
  const midway = readChecks(world, questList[0]!).find(check => check.id === 'done')
  expect(midway?.text).toBe('Bram receives 4 ingots 2/4')
  expect(midway?.state).toBe('pending')
  expect(midway?.reason).toBeUndefined()
  order.shipped = 4
  const done = readChecks(world, questList[0]!).find(check => check.id === 'done')
  expect(done?.state).toBe('passing')
  expect(done?.reason).toBeUndefined()
  expect(readChecks(world, questList[0]!).every(check => check.state === 'passing')).toBe(true)
})

test('a route check stays pending until the window is full, then names the call count', () => {
  const world = createWorld(kettlewick)
  world.pathWindow = [1, 1, 1]
  const early = readChecks(world, questList[5]!).find(check => check.id === 'memory')
  expect(early?.text).toBe('The route is remembered 3/8')
  expect(early?.state).toBe('pending')
  expect(early?.reason).toBeUndefined()
  world.pathWindow = [1, 1, 1, 1, 1, 1, 1, 1]
  const late = readChecks(world, questList[5]!).find(check => check.id === 'memory')
  expect(late?.state).toBe('failed')
  expect(late?.reason).toBe('path calls 8')
  expect(late?.reason ?? '').not.toMatch(solution)
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
