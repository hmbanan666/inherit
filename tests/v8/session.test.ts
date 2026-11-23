import { expect, test } from 'vitest'
import { diagnostics } from '../packs/compiler'
import { declarations, kettlewick, mining } from '../../packages/sim/src/v8'
import { runSession } from '../../packages/sandbox/src/v8'

test('Uncle spends the budget every tick while only the first drone hauls ore', async () => {
  const world = await runSession(kettlewick, kettlewick.files, 32)
  expect(world.cpu).toEqual({ used: 30, limit: 30 })
  expect(world.messages).toHaveLength(32)
  for (const message of world.messages) {
    expect(message.text).toContain('CPU limit')
    expect(kettlewick.files[message.file].split('\n')[message.line - 1]).toContain('findPath')
  }
  expect(world.depot.ore).toBeGreaterThan(0)
  expect(world.drones.slice(1)).toEqual(kettlewick.drones.slice(1))
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
  const types = declarations(mining(kettlewick))
  expect(diagnostics(kettlewick.files, types)).toEqual([])
  expect(diagnostics(cached, types)).toEqual([])
  expect(diagnostics({ 'main.ts': 'import { findPath } from "inherit"; findPath(1, 2)' }, types))
    .toHaveLength(1)
})
