import { expect, test } from 'vitest'
import { declarations } from '../../packages/sim/src/v8/core/bricks'
import { createWorld, migrateWorld, purityRate, settleVein } from '../../packages/sim/src/v8/core/world'
import { factoryBricks, kettlewick } from '../../packages/sim/src/v8'
import { readChecks } from '../../packages/sim/src/v8/checkFacts'
import { questList } from '../../packages/sim/src/v8/quests'
import { createSession } from '../../packages/sandbox/src/v8'

const mineA = `import { drones, veins } from "inherit"
export function onTick() { drones()[0].mine(veins()[0]) }`

test('a poor vein takes 5 ticks per ore and the check names the progress', async () => {
  const session = await createSession(kettlewick, { 'main.ts': mineA })
  try {
    expect(session.accept()).toBe(true)
    const drone = session.world.drones[0]!
    const vein = session.world.veins[0]!
    drone.pos = { ...vein.pos }
    expect(vein.purity).toBe('poor')
    expect(purityRate('poor')).toEqual({ ticksPerUnit: 5, yield: 1 })
    session.step(3)
    expect(drone.cargo).toBe(0)
    expect(drone.dig).toEqual({ vein: 'A', ticks: 3 })
    const readings = readChecks(session.world, questList[0]!)
    expect(readings.find(check => check.id === 'ore')?.reason).toBe('drone-1 mining Vein A (poor): 3/5 ticks')
    session.step(2)
    expect(drone.cargo).toBe(1)
    expect(drone.dig).toBeNull()
    session.step(10)
    expect(drone.cargo).toBe(3)
    expect(session.world.messages.some(message => message.text.includes('left 0'))).toBe(false)
  } finally { session.dispose() }
})

test('normal takes 2 ticks and rich yields 2 in one tick', async () => {
  const session = await createSession(kettlewick, { 'main.ts': `import { drones, veins } from "inherit"
    export function onTick() {
      const vein = veins().find(item => item.name === "C") || veins()[0]
      drones()[0].mine(vein)
    }` })
  try {
    const drone = session.world.drones[0]!
    session.world.veins[0] = settleVein({ ...session.world.veins[0]!, purity: 'normal' })
    drone.pos = { ...session.world.veins[0]!.pos }
    session.step(1)
    expect(drone.cargo).toBe(0)
    session.step(1)
    expect(drone.cargo).toBe(1)
    const rich = session.world.veins.find(vein => vein.name === 'C')!
    rich.hidden = false
    drone.pos = { ...rich.pos }
    drone.cargo = 0
    drone.carrying = null
    session.step(1)
    expect(drone.cargo).toBe(2)
    expect(rich.purity).toBe('rich')
    expect(rich.ticksPerUnit).toBe(1)
  } finally { session.dispose() }
})

test('kettlewick places a normal vein between the poor cuts and the rich one', () => {
  const world = createWorld(kettlewick)
  const ore = world.veins.filter(vein => vein.kind === 'ore')
  expect(ore.map(vein => [vein.name, vein.purity, vein.hidden ?? false])).toEqual([
    ['A', 'poor', false],
    ['D', 'normal', false],
    ['C', 'rich', true],
  ])
  expect(ore[1]).toMatchObject({ ticksPerUnit: 2, yield: 1 })
  expect(world.veins.find(vein => vein.name === 'B')).toMatchObject({ purity: 'poor', kind: 'coal' })
  const depot = world.depot.pos
  const dist = (pos: { x: number; y: number }) => Math.abs(pos.x - depot.x) + Math.abs(pos.y - depot.y)
  expect(dist(ore[0]!.pos)).toBeLessThan(dist(ore[1]!.pos))
  expect(dist(ore[1]!.pos)).toBeLessThan(dist(ore[2]!.pos))
})

test('a saved finite vein becomes a purity and loses its stock', () => {
  const world = createWorld(kettlewick)
  world.veins[0] = { name: 'A', pos: { x: 6, y: 2 }, kind: 'ore', hidden: false, left: 12 } as unknown as typeof world.veins[number]
  migrateWorld(world)
  expect(world.veins[0]?.purity).toBe('poor')
  expect(world.veins[0]?.ticksPerUnit).toBe(5)
  expect(world.veins[0]?.yield).toBe(1)
  expect('left' in (world.veins[0] ?? {})).toBe(false)
  expect(world.veins.find(vein => vein.name === 'C')?.purity).toBe('rich')
  const text = declarations(factoryBricks(kettlewick))
  expect(text).toContain("readonly purity: 'poor' | 'normal' | 'rich'")
  expect(text).toContain('readonly ticksPerUnit: number')
  expect(text).toContain('readonly yield: number')
  expect(text).not.toContain('readonly left')
})
