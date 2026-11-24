import { expect, test } from 'vitest'
import { diagnostics } from './diagnostics'
import { declarations, factoryBricks, kettlewick, repeatedLabel } from '../../packages/sim/src/v8'
import { itemType } from '../../packages/sim/src/v8/modules/stock'
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
  expect(types).toContain(`readonly cargoKind: ${itemType} | null`)
  expect(types).toContain('dump(): void')
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
    session.world.cleared = ['bram', 'ines']
    expect(session.accept()).toBe(true)
    expect(session.world.questId).toBe('odile')

    const drone = () => session.world.drones[0]!
    drone().pos = { x: 6, y: 1 }
    await session.deploy(mine(0))
    session.step(10)
    expect(drone()).toMatchObject({ cargo: 2, carrying: 'ore', capacity: 3 })

    await session.deploy({
      'main.ts': `import { drones, memory } from "inherit"
export function onTick() { memory.kind = drones()[0].cargoKind }`,
    })
    session.step(1)
    expect(session.world.memory.kind).toBe('ore')

    // Next to Vein B, still carrying ore. Raw cargo is dumped and mining starts.
    drone().pos = { x: 14, y: 1 }
    await session.deploy(mine(1))
    session.step(1)
    expect(drone()).toMatchObject({ cargo: 0, carrying: null })
    expect(drone().dig).toEqual({ vein: 'B', ticks: 1 })
    const dumped = 'drone-1 dumped 2 ore to mine coal at Vein B'
    expect(session.world.console.some(line => line.level === 'info' && line.text === dumped)).toBe(true)
    expect(session.world.messages.some(message => message.text.includes('unload ore first'))).toBe(false)
    Object.assign(drone(), { cargo: 2, carrying: 'ore' as const, source: 'A', dig: null })

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
    session.step(10)
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
    session.step(10)
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
    session.step(10)
    drone().pos = { x: 1, y: 2 }
    await session.deploy(unload('depot'))
    session.step(1)
    expect(session.world.depot.coal).toBe(2)
    expect(session.world.depot.ore).toBe(2)
    expect(drone().cargo).toBe(0)

    // mine() from the furnace walks to the vein. It does not refuse for distance.
    drone().pos = { x: 3, y: 1 }
    drone().cargo = 0
    drone().carrying = null
    await session.deploy(mine(1))
    session.step(3)
    expect(drone().pos).not.toEqual({ x: 3, y: 1 })
    expect(session.world.messages.some(message => message.text.includes('not next to'))).toBe(false)

    // An empty unload throws the same sentence every tick, and the log keeps one row.
    drone().pos = { x: 1, y: 2 }
    drone().cargo = 0
    drone().carrying = null
    drone().task = null
    await session.deploy(unload('depot'))
    session.step(3)
    const away = 'Depot accepts ore and coal; drone-1 at (1,2) carries nothing'
    const hit = session.world.messages.find(message => message.text.includes(away))
    expect(hit?.count).toBe(3)
    expect(hit?.tick).toBe(session.world.tick)
    expect(session.world.messages.filter(message => message.text.includes(away))).toHaveLength(1)
    const logged = session.world.console.filter(line => line.level === 'error' && line.text.includes(away))
    expect(logged).toHaveLength(1)
    expect(logged[0]).toMatchObject({ count: 3, tick: session.world.tick })
    expect(repeatedLabel(away, logged[0]?.count)).toBe(`${away} x 3`)
    expect(session.world.console.filter(line => line.text === dumped)).toHaveLength(1)
  } finally { session.dispose() }
})
