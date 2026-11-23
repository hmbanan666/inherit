import { expect, test } from 'vitest'
import { diagnostics } from '../packs/compiler'
import { declarations, kettlewick, factoryBricks } from '../../packages/sim/src/v8'
import { createSession, runSession } from '../../packages/sandbox/src/v8'

test('Uncle exhausts the budget hauling to the furnace and loses credits while both orders go overdue', async () => {
  const world = await runSession(kettlewick, kettlewick.files, 181)
  expect(world.cpu).toEqual({ used: 30, limit: 30 })
  expect(world.messages.at(-1)?.text).toContain('CPU limit')
  expect(world.furnace.input).toBeGreaterThan(0)
  expect(world.credits).toBeLessThan(kettlewick.credits)
  expect(world.orders.map(o => o.status)).toEqual(['overdue', 'overdue'])
  expect(world.drones.at(-1)).toEqual(kettlewick.drones.at(-1))
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
  const first = await runSession(kettlewick, cached, 1)
  for (const [i, drone] of first.drones.entries()) expect(drone.pos).not.toEqual(kettlewick.drones[i].pos)
  const world = await runSession(kettlewick, cached, 32)
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
