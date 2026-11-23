import { expect, test } from 'vitest'
import { diagnostics } from '../packs/compiler'
import { declarations, kettlewick, factoryBricks } from '../../packages/sim/src/v8'
import { createSession, runSession } from '../../packages/sandbox/src/v8'

test('uncle fills the cart and the village pays nothing until that line changes', async () => {
  const session = await createSession(kettlewick, kettlewick.files)
  try {
    expect(session.world.drones).toHaveLength(1)
    expect(session.world.orders.map(order => order.from)).toEqual(['Bram'])
    session.step(1)
    expect(session.world.drones[0].pos).not.toEqual(kettlewick.depot.pos)
    expect(session.world.cpu.used).toBeLessThan(session.world.cpu.limit / 2)
    while (!session.world.status.includes('never comes back') && session.world.tick < 40) session.step(1)
    const status = session.world.status
    expect(status).toContain('Send it when the cart is full')
    const cargo = session.world.drones[0].cargo
    session.step(6)
    expect(session.world.status).toBe(status)
    expect(session.world.drones[0].cargo).toBe(cargo)
    expect(session.world.credits).toBe(kettlewick.credits)
    expect(session.world.orders[0].shipped).toBe(0)
    expect(session.world.furnace.output).toBe(0)
  } finally { session.dispose() }
})

test('sending the full cart home pays Bram and then the mayor asks', async () => {
  const fixed = { 'main.ts': kettlewick.files['main.ts'].replace(
    'const home = false // change to: drone.cargo >= drone.capacity',
    'const home = drone.cargo >= drone.capacity',
  ) }
  const session = await createSession(kettlewick, fixed)
  try {
    while (session.world.ledger.income < kettlewick.orderSchedule[0].pay && session.world.tick < 400) session.step(1)
    session.step(1)
    expect(session.world.orders[0].status).toBe('on time')
    expect(session.world.orders[1]).toMatchObject({ from: 'Mayor Odile', status: 'open' })
    expect(session.world.credits).toBe(kettlewick.credits + kettlewick.orderSchedule[0].pay)
    expect(session.world.growth[0]).toContain('forge is lit')
    expect(session.world.creditsPerMinute).toBeGreaterThan(0)
    expect(session.world.messages).toEqual([])
    const pay = kettlewick.orderSchedule.reduce((total, order) => total + order.pay, 0)
    while (session.world.ledger.income < pay && session.world.tick < 800) session.step(1)
    expect(session.world.ledger.income).toBe(pay)
    expect(session.world.orders.map(order => order.from)).toEqual(['Bram', 'Mayor Odile', 'Elsie'])
    expect(session.world.credits).toBe(kettlewick.credits + pay)
    expect(session.world.tick).toBeLessThan(500)
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

test('restoring the world and deployed helpers resumes the same tick and guest memory', async () => {
  const files = { 'main.ts': 'import { tally } from "./lib/helpers"; export function onTick() { tally() }',
    'lib/helpers.ts': 'import { memory } from "inherit"; export function tally() { memory.n = (memory.n ?? 0) + 1 }' }
  const saved = await runSession(kettlewick, files, 7)
  const session = await createSession(kettlewick, files, JSON.parse(JSON.stringify(saved)))
  try {
    expect(session.world).toEqual(saved)
    session.step(1)
    expect(session.world).toEqual(await runSession(kettlewick, files, 8))
  } finally { session.dispose() }
})
