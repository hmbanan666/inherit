import { expect, test } from 'vitest'
import { diagnostics } from '../packs/compiler'
import { declarations, kettlewick, factoryBricks } from '../../packages/sim/src/v8'
import { createSession, runSession } from '../../packages/sandbox/src/v8'

test('one drone runs comfortably under budget while Uncle burns fuel on an empty furnace', async () => {
  const world = await runSession(kettlewick, kettlewick.files, 1)
  expect(world.drones).toHaveLength(1)
  expect(world.drones[0].pos).not.toEqual(kettlewick.depot.pos)
  expect(world.cpu.used).toBeLessThan(world.cpu.limit / 2)
  expect(world.status).toContain('burns fuel while empty')
  expect(world.creditChange).toBe(-1.5)
  expect(world.furnace.input).toBe(0)
  expect(world.credits).toBe(kettlewick.credits - kettlewick.rentPerTick - kettlewick.recipe.fuel)
})

test('guarding smelt stops the empty fuel charge and fills the first order on time', async () => {
  const session = await createSession(kettlewick)
  try {
    session.step(1)
    const balance = session.world.credits
    await session.deploy({ 'main.ts': kettlewick.files['main.ts'].replace(
      '  furnace.smelt()', '  if (furnace.input >= 2) furnace.smelt()',
    ) })
    session.step(1)
    expect(session.world.credits).toBe(balance - kettlewick.rentPerTick)
    let minimum = session.world.credits
    while (session.world.orders[0].status === 'open' && session.world.tick < kettlewick.orderSchedule[0].due) {
      session.step(1)
      minimum = Math.min(minimum, session.world.credits)
    }
    expect(minimum).toBeGreaterThan(kettlewick.credits / 2)
    expect(session.world.creditChange).toBeGreaterThan(0)
    expect(session.world.orders[0].status).toBe('on time')
    expect(session.world.credits).toBeGreaterThan(kettlewick.credits)
    expect(session.world.messages).toEqual([])
  } finally { session.dispose() }
})

const cached = {
  'main.ts': `import { cpu, depot, drones, findPath, memory, tick, veins } from "inherit"

export function onTick() {
  const vein = veins()[0]
  memory.outbound ??= findPath(depot.pos, vein.pos)
  for (const drone of drones()) {
    if (drone.cargo === drone.capacity) {
      if (drone.isNear(depot)) drone.unload(depot)
      else {
        memory.home ??= [depot.pos, ...memory.outbound].reverse()
        drone.moveAlong(memory.home)
      }
    } else if (drone.isNear(vein)) drone.mine(vein)
    else drone.moveAlong(memory.outbound)
  }
  memory.costs ??= []
  memory.costs.push(cpu.used())
  memory.lastTick = tick
}`,
}

test('a cached route moves every drone and stays under 15 CPU on every tick', async () => {
  const site = { ...kettlewick, drones: [1, 2, 3].map(i => ({ ...kettlewick.drones[0], name: 'drone-' + i })) }
  const first = await runSession(site, cached, 1)
  for (const [i, drone] of first.drones.entries()) expect(drone.pos).not.toEqual(site.drones[i].pos)
  const world = await runSession(site, cached, 32)
  expect(world.messages).toEqual([])
  expect(world.depot.ore).toBeGreaterThanOrEqual(9)
  expect(world.memory.lastTick).toBe(32)
  const costs = world.memory.costs as number[]
  expect(costs).toHaveLength(32)
  expect(costs.slice(0, 2)).toEqual([6, 3])
  expect(Math.max(...costs)).toBeLessThan(15)
})

test('a fresh session replays the same site seed and files to the same world', async () => {
  const site = { ...kettlewick, seed: 42 }
  const first = await runSession(site, cached, 32)
  expect(first.messages).toEqual([])
  expect(await runSession(site, cached, 32)).toEqual(first)
})

test('the generated inherit declarations typecheck both controllers and require path endpoints to be cells', () => {
  const types = declarations(factoryBricks(kettlewick))
  expect(diagnostics(kettlewick.files, types)).toEqual([])
  expect(diagnostics(cached, types)).toEqual([])
  expect(diagnostics({ 'main.ts': 'import { findPath } from "inherit"; findPath(1, 2)' }, types))
    .toHaveLength(1)
})

test('deploy replaces the controller on the same world and a failed deploy keeps it running', async () => {
  const session = await createSession(kettlewick, cached)
  try {
    session.step(32)
    const ore = session.world.depot.ore
    await session.deploy({ 'main.ts': `import { memory } from "inherit"
      export function onTick() { memory.lastTick++ }` })
    await expect(session.deploy({ 'main.ts': 'export const broken =' })).rejects.toThrow()
    session.step(1)
    expect(session.world.tick).toBe(33)
    expect(session.world.depot.ore).toBe(ore)
    expect(session.world.memory.lastTick).toBe(33)
    expect(session.world.cpu.used).toBe(0)
  } finally { session.dispose() }
})
