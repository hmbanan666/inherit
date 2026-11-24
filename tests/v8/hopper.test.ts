import { expect, test } from 'vitest'
import { kettlewick, shop } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'

const unload = `import { drones, furnace } from "inherit"
export function onTick() { drones()[0].unload(furnace) }`

test('unload fills only the free hopper space and keeps the rest', async () => {
  const session = await createSession(kettlewick, { 'main.ts': unload })
  try {
    const drone = session.world.drones[0]!
    Object.assign(drone, { pos: { ...session.world.furnace.pos }, cargo: 3, carrying: 'ore' as const, source: 'A' })
    session.world.furnace.input = 5
    session.step(1)
    expect(session.world.furnace.input).toBe(6)
    expect(drone.cargo).toBe(2)
    expect(drone.carrying).toBe('ore')
    expect(session.world.messages).toEqual([])
  } finally { session.dispose() }
})

test('a full hopper names the drone, the cargo, and the furnace', async () => {
  const session = await createSession(kettlewick, { 'main.ts': unload })
  try {
    const drone = session.world.drones[0]!
    Object.assign(drone, { pos: { ...session.world.furnace.pos }, cargo: 2, carrying: 'ore' as const })
    session.world.furnace.input = 6
    session.step(1)
    expect(session.world.furnace.input).toBe(6)
    expect(drone.cargo).toBe(2)
    expect(session.world.messages.some(message => message.text.includes('drone-1 keeps 2 ore; Furnace is full (6/6 ore). Wait for smelt() or unload at the depot.'))).toBe(true)
    session.world.furnace.input = 8
    session.step(1)
    expect(session.world.furnace.input).toBe(8)
    expect(drone.cargo).toBe(2)
  } finally { session.dispose() }
})

test('Bigger hopper raises both caps and the depot stays unlimited', async () => {
  const session = await createSession(kettlewick, kettlewick.files)
  try {
    expect(session.world.furnace.oreMax).toBe(6)
    expect(session.world.furnace.coalMax).toBe(3)
    const credits = session.world.credits
    expect(session.buy('hopper')).toBe(true)
    expect(session.world.furnace.oreMax).toBe(12)
    expect(session.world.furnace.coalMax).toBe(6)
    expect(session.world.credits).toBe(credits - shop.find(item => item.id === 'hopper')!.price)
    const drone = session.world.drones[0]!
    Object.assign(drone, { pos: { ...session.world.depot.pos }, cargo: 3, carrying: 'ore' as const })
    await session.deploy({ 'main.ts': 'import { drones, depot } from "inherit"\nexport function onTick() { drones()[0].unload(depot) }' })
    session.step(1)
    expect(session.world.depot.ore).toBe(3)
    expect(drone.cargo).toBe(0)
  } finally { session.dispose() }
})
