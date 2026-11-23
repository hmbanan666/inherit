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

test('ship draws only available ingots, pays on completion and closes expired orders', async () => {
  const order = { id: 'hale', from: 'Hale', item: 'ingot' as const, qty: 3, due: 2, pay: 40, at: 1 }
  const site = { ...kettlewick, graceTicks: 2, furnace: { ...kettlewick.furnace, output: 8 },
    orderSchedule: [order, { ...order, id: 'late', at: 2 }, { ...order, id: 'expires', at: 2 }] }
  const session = await createSession(site, { 'main.ts': `import { orders, ship, tick, memory, credits } from "inherit"
    export function onTick() {
      const open = orders()
      if (tick === 1) ship(open[0], 1)
      if (tick === 2) ship(open[0], 8)
      if (tick === 4) ship(open[0])
      memory.open = orders().length
      memory.balance = credits()
    }` })
  try {
    session.step(1)
    expect(session.world.orders[0]).toMatchObject({ shipped: 1, status: 'open' })
    expect(session.world.ledger.income).toBe(0)
    session.step(4)
    expect(session.world.orders.map(o => o.status)).toEqual(['on time', 'late', 'expired'])
    expect(session.world.furnace.output).toBe(2)
    expect(session.world.ledger.income).toBe(60)
    expect(session.world.memory).toEqual({ open: 0, balance: 357.5 })
  } finally { session.dispose() }
})

test('bankruptcy counts consecutive closing balances, including ticks interrupted by a guest error', async () => {
  const site = { ...kettlewick, credits: 0, furnace: { ...kettlewick.furnace, output: 1 },
    orderSchedule: [{ ...kettlewick.orderSchedule[0], qty: 1, pay: 25 }] }
  const session = await createSession(site, { 'main.ts': `import { orders, ship, tick } from "inherit"
    export function onTick() {
      if (tick === 49) ship(orders()[0])
      throw new Error("Stopped")
    }` })
  try {
    session.step(49)
    expect(session.world.credits).toBe(0.5)
    expect(session.world.ledger.debtTicks).toBe(0)
    session.step(50)
    expect(session.world.bankrupt).toBe(false)
    session.step(3)
    expect(session.world.bankrupt).toBe(true)
    expect(session.world.tick).toBe(100)
    expect(session.world.ledger.rent).toBe(50)
  } finally { session.dispose() }
})
