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
    expect(session.world.credits).toBe(kettlewick.credits)
  } finally { session.dispose() }
})

test('ship draws only available ingots, pays on completion and closes expired orders', async () => {
  const order = { ...kettlewick.orderSchedule[0], id: 'hale', from: 'Hale', qty: 3, due: 2, pay: 40, at: 1, after: undefined }
  const site = { ...kettlewick, repeatOrders: false, graceTicks: 2, furnace: { ...kettlewick.furnace, output: 8 },
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
    expect(session.world.memory).toEqual({ open: 0, balance: 360 })
  } finally { session.dispose() }
})

test('running an empty furnace at zero credits never ends the session or spends savings', async () => {
  const site = { ...kettlewick, credits: 0 }
  const session = await createSession(site, { 'main.ts': 'import { furnace } from "inherit"; export function onTick() { furnace.smelt() }' })
  try {
    session.step(500)
    expect(session.world.tick).toBe(500)
    expect(session.world.orders[0].status).toBe('open')
    expect(session.world.orders[0].due).toBeGreaterThan(500)
    expect(session.world.credits).toBe(0)
    expect(session.world.creditsPerMinute).toBe(0)
  } finally { session.dispose() }
})

// Isolate shipping priority from Uncle's pathfinding. The low-CPU controller
// reserves every ninth tick for production. Once one order closes, the spare
// action can also start a batch between those production ticks.
test('first-come shipping delivers both orders late; prioritizing the earlier deadline delivers both on time', async () => {
  const [bram, odile] = kettlewick.orderSchedule
  const site = { ...kettlewick, repeatOrders: false, cpuLimit: 2,
    orderSchedule: [{ ...bram, qty: 20, due: 180, after: undefined }, { ...odile, at: 1, qty: 10, due: 98, after: undefined }],
    furnace: { ...kettlewick.furnace, input: 60 } }
  async function deliver(sort: string) {
    const session = await createSession(site, { 'main.ts': `import { furnace, orders, ship, tick } from "inherit"
      export function onTick() {
        if (tick % 9 === 0) furnace.smelt()
        for (const order of orders()${sort}) ship(order)
        if (tick % 9 !== 0 && furnace.input) furnace.smelt()
      }` })
    try {
      session.step(250)
      return session.world.orders.map(o => o.status)
    } finally { session.dispose() }
  }
  expect(await deliver('')).toEqual(['late', 'late'])
  expect(await deliver('.sort((a, b) => a.due - b.due)')).toEqual(['on time', 'on time'])
})

test('a direct haul route and earliest-due shipping fill the actual Kettlewick orders at full pay', async () => {
  const session = await createSession(kettlewick, { 'main.ts': `import { drones, veins, furnace, findPath, orders, ship } from "inherit"
    export function onTick() {
      const vein = veins()[0]
      for (const drone of drones()) {
        if (drone.cargo < drone.capacity) {
          if (drone.isNear(vein)) drone.mine(vein)
          else drone.moveAlong(findPath(drone.pos, vein.pos))
        } else if (drone.isNear(furnace)) drone.unload(furnace)
        else drone.moveAlong(findPath(drone.pos, furnace.pos))
      }
      if (furnace.input >= 2) furnace.smelt()
      for (const order of orders().sort((a, b) => a.due - b.due)) ship(order)
    }` })
  try {
    const pay = kettlewick.orderSchedule.reduce((total, order) => total + order.pay, 0)
    while (session.world.ledger.income < pay && session.world.tick < kettlewick.orderSchedule[1].due) session.step(1)
    expect(session.world.messages).toEqual([])
    expect(session.world.orders.map(o => o.status)).toEqual(['on time', 'on time'])
    expect(session.world.ledger.income).toBe(pay)
    expect(session.world.credits).toBeGreaterThan(kettlewick.credits)
  } finally { session.dispose() }
})
