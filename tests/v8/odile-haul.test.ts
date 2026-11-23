import { expect, test } from 'vitest'
import { diagnostics } from '../packs/compiler'
import { declarations, factoryBricks, kettlewick, repeatedLabel } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'

const mine = (index: number) => ({
  'main.ts': `import { drones, veins } from "inherit"
export function onTick() { drones()[0].mine(veins()[${index}]) }`,
})
const unload = (station: 'furnace' | 'depot') => ({
  'main.ts': `import { drones, ${station} } from "inherit"
export function onTick() { drones()[0].unload(${station}) }`,
})

test('the editor types name drone.cargoKind and depot coal', () => {
  const types = declarations(factoryBricks(kettlewick))
  expect(types).toContain("readonly cargoKind: 'ore' | 'coal' | null")
  expect(types).toContain('readonly coal: number')
  expect(diagnostics({
    'main.ts': `import { depot, drones, furnace } from "inherit"
export function onTick() {
  const drone = drones()[0]
  if (drone.cargoKind === "coal") drone.unload(furnace)
  else if (drone.cargoKind === "ore") drone.unload(depot)
}`,
  }, types)).toEqual([])
  expect(repeatedLabel('Vein B', 1)).toBe('Vein B')
  expect(repeatedLabel('Vein B', 120)).toBe('Vein B x 120')
})

test('Odile haul: mixed cargo is refused, ore and coal both unload, and the same error counts once', async () => {
  const session = await createSession(kettlewick)
  try {
    session.world.level = 2
    session.world.xp = 20
    session.world.cleared = ['bram']
    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('odile')

    const drone = () => session.world.drones[0]!
    drone().pos = { x: 6, y: 1 }
    await session.deploy(mine(0))
    session.step(2)
    expect(drone()).toMatchObject({ cargo: 2, carrying: 'ore', capacity: 3 })

    await session.deploy({
      'main.ts': `import { drones, memory } from "inherit"
export function onTick() { memory.kind = drones()[0].cargoKind }`,
    })
    session.step(1)
    expect(session.world.memory.kind).toBe('ore')

    // Next to Vein B, still carrying ore. One kind in the cart is a design rule.
    drone().pos = { x: 14, y: 1 }
    const coalLeft = session.world.veins.find(vein => vein.name === 'B')!.left
    await session.deploy(mine(1))
    session.step(1)
    expect(drone().cargo).toBe(2)
    expect(drone().carrying).toBe('ore')
    expect(session.world.veins.find(vein => vein.name === 'B')!.left).toBe(coalLeft)
    const mixed = 'drone-1 at (14,1) carries ore 2/3; Vein B gives coal; unload ore first (depot or furnace accept ore)'
    expect(session.world.messages.some(message => message.text.includes(mixed))).toBe(true)

    // Ore next to the furnace is accepted. The furnace has no mode that refuses ore.
    const beforeFurnace = session.world.messages.length
    drone().pos = { x: 3, y: 1 }
    await session.deploy(unload('furnace'))
    session.step(1)
    expect(session.world.furnace.input).toBe(2)
    expect(drone()).toMatchObject({ cargo: 0, carrying: null })
    expect(session.world.messages.length).toBe(beforeFurnace)

    session.step(1)
    expect(session.world.furnace.input).toBe(2)
    expect(session.world.messages.at(-1)?.text).toContain('Furnace accepts ore and coal; drone-1 at (3,1) carries nothing')

    // Ore next to the depot is accepted.
    drone().pos = { x: 6, y: 1 }
    await session.deploy(mine(0))
    session.step(2)
    expect(drone().carrying).toBe('ore')
    drone().pos = { x: 1, y: 2 }
    const beforeDepot = session.world.messages.length
    await session.deploy(unload('depot'))
    session.step(1)
    expect(session.world.depot.ore).toBe(2)
    expect(drone().cargo).toBe(0)
    expect(session.world.messages.length).toBe(beforeDepot)

    // Coal next to the furnace is accepted into furnace.coal.
    drone().pos = { x: 14, y: 1 }
    await session.deploy(mine(1))
    session.step(2)
    expect(drone()).toMatchObject({ cargo: 2, carrying: 'coal' })
    drone().pos = { x: 3, y: 1 }
    await session.deploy(unload('furnace'))
    session.step(1)
    expect(session.world.furnace.coal).toBe(2)
    expect(session.world.furnace.input).toBe(2)
    expect(drone().cargo).toBe(0)

    // Coal next to the depot used to be discarded. The depot keeps it.
    drone().pos = { x: 14, y: 1 }
    await session.deploy(mine(1))
    session.step(2)
    drone().pos = { x: 1, y: 2 }
    await session.deploy(unload('depot'))
    session.step(1)
    expect(session.world.depot.coal).toBe(2)
    expect(session.world.depot.ore).toBe(2)
    expect(drone().cargo).toBe(0)

    // The playtest: cargo 2/3 of ore, standing next to the furnace, mining Vein B.
    drone().pos = { x: 6, y: 1 }
    await session.deploy(mine(0))
    session.step(2)
    drone().pos = { x: 3, y: 1 }
    await session.deploy(mine(1))
    session.step(3)
    const away = 'drone-1 at (3,1) carries ore 2/3; not next to Vein B (coal); nearest: Furnace'
    const hit = session.world.messages.find(message => message.text.includes(away))
    expect(hit?.count).toBe(3)
    expect(hit?.tick).toBe(session.world.tick)
    expect(session.world.messages.filter(message => message.text.includes('not next to Vein B'))).toHaveLength(1)
    const logged = session.world.console.filter(line => line.level === 'error' && line.text.includes(away))
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatchObject({ count: 3, tick: session.world.tick })
    expect(repeatedLabel(away, logged[0]?.count)).toBe(`${away} x 3`)
    expect(drone()).toMatchObject({ cargo: 2, carrying: 'ore' })
    expect(session.world.messages.find(message => message.text.includes(mixed))?.count).toBe(1)
  } finally { session.dispose() }
})
