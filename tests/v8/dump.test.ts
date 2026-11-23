import { expect, test } from 'vitest'
import { kettlewick, inspectAt } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'

const dump = `import { drones } from "inherit"
export function onTick() { drones()[0].dump() }`
const mineCoal = `import { drones, veins } from "inherit"
export function onTick() { drones()[0].mine(veins().find(vein => vein.name === "B")) }`

test('dump() empties ore or coal and leaves ingots in the cart', async () => {
  const session = await createSession(kettlewick, { 'main.ts': dump })
  try {
    const drone = session.world.drones[0]!
    Object.assign(drone, { cargo: 2, carrying: 'ore' as const, source: 'A', dig: { vein: 'A', ticks: 3 } })
    session.step(1)
    expect(drone).toMatchObject({ cargo: 0, carrying: null, source: '', dig: null })
    expect(session.world.cpu.used).toBe(kettlewick.costs.action)
    expect(session.world.messages).toEqual([])

    Object.assign(drone, { cargo: 1, carrying: 'coal' as const, source: 'B' })
    session.dump('drone-1')
    expect(drone).toMatchObject({ cargo: 0, carrying: null })

    Object.assign(drone, { cargo: 2, carrying: 'ingot' as const })
    session.step(1)
    expect(drone).toMatchObject({ cargo: 2, carrying: 'ingot' })
    expect(session.world.messages.some(message => message.text.includes('drone-1 carries ingot 2/3. Only ore and coal can be dumped.'))).toBe(true)
    expect(() => session.dump('drone-1')).toThrow(/Only ore and coal can be dumped/)
    expect(drone.cargo).toBe(2)

    Object.assign(drone, { pos: { x: 1, y: 1 }, carrying: 'steel' as const, cargo: 1 })
    expect(inspectAt(session.world, 1, 1)?.dump).toBe('drone-1')
  } finally { session.dispose() }
})

test('mining the other rock dumps ore and refuses a cart of steel', async () => {
  const session = await createSession(kettlewick, { 'main.ts': mineCoal })
  try {
    const drone = session.world.drones[0]!
    const coal = session.world.veins.find(vein => vein.name === 'B')!
    Object.assign(drone, { pos: { ...coal.pos }, cargo: 2, carrying: 'ore' as const, source: 'A' })
    session.step(1)
    expect(drone).toMatchObject({ cargo: 0, carrying: null, dig: { vein: 'B', ticks: 1 } })
    expect(session.world.console.some(line => line.level === 'info' && line.text === 'drone-1 dumped 2 ore to mine coal at Vein B')).toBe(true)
    expect(session.world.messages).toEqual([])

    Object.assign(drone, { cargo: 1, carrying: 'steel' as const, dig: null })
    session.step(1)
    expect(drone).toMatchObject({ cargo: 1, carrying: 'steel' })
    expect(session.world.messages.some(message => message.text.includes('cart holds steel. Only ore and coal can be dumped.'))).toBe(true)
  } finally { session.dispose() }
})
