import { expect, test } from 'vitest'
import { kettlewick } from '../../packages/sim/src/v8'
import { createSession } from '../../packages/sandbox/src/v8'

test('a nearby drone supplies the furnace and one batch finishes four ticks after ignition', async () => {
  const session = await createSession(kettlewick, { 'main.ts': `import { drones, furnace, memory, tick } from "inherit"
    export function onTick() {
      if (tick === 1) drones()[0].unload(furnace)
      furnace.smelt()
      memory.stock = [furnace.input, furnace.output]
    }` })
  try {
    Object.assign(session.world.drones[0], { pos: { ...kettlewick.furnace.pos }, cargo: 2 })
    session.step(4)
    expect(session.world.memory.stock).toEqual([0, 0])
    session.step(1)
    expect(session.world.memory.stock).toEqual([0, 1])
    expect(session.world.credits).toBe(300 - 5 * (1 + kettlewick.rentPerTick))
  } finally { session.dispose() }
})
