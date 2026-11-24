import { readFileSync } from 'node:fs'
import type { createSession } from '../packages/sandbox/src/v8'
import { kettlewick, shop } from '../packages/sim/src/v8'

export type Session = Awaited<ReturnType<typeof createSession>>
export type Stage = 'manual' | 'run' | 'steel-loop' | 'two-drones'
const source = (name: string) => readFileSync(new URL(`./players/${name}.ts`, import.meta.url), 'utf8')
const helpers = { 'lib/haul.ts': source('haul') }
export const players: Record<Stage, Record<string, string>> = {
  manual: kettlewick.files,
  run: { 'main.ts': source('run') },
  'steel-loop': { 'main.ts': source('steel-loop'), ...helpers },
  'two-drones': { 'main.ts': source('two-drones'), ...helpers },
}

// Unlisted quests keep the deployed files. A proposed edit after the tutorial
// is tried only if the previous player fails a separate replay from Take.
export const edits: Record<string, { to: Stage; reason: string; practice?: boolean } | undefined> = {
  ines: { to: 'run', practice: true, reason: 'Use the newly earned Run to fire the furnace.' },
  odile: { to: 'steel-loop', reason: 'Loop must fetch coal and alloy steel.' },
  elsie: { to: 'two-drones', reason: 'Send the second cart for coal and depot deliveries.' },
}

export function act(session: Session, stage: Stage) {
  if (stage !== 'manual' && stage !== 'run') return
  const { world } = session
  const { furnace } = world
  if (furnace.readyAt === null && furnace.input >= kettlewick.recipe.ore && !furnace.output) {
    if (stage === 'run') session.queue('smeltOnce')
    else session.press('smelt')
  }
  const cart = world.drones[0]
  if (cart.task) return
  if (cart.cargo) session.press('unload', cart.name)
  else if (furnace.output) session.press('collect', cart.name)
  else if (furnace.readyAt === null && furnace.input < kettlewick.recipe.ore) session.press('mine', cart.name)
}

// Reconsider at Take and after each tick. The catalog itself is the live
// list of unlocked conveniences (ADR 0026). buy() owns the transaction.
export function buyForGoal(session: Session) {
  const { world } = session
  const order = world.orders.find(order => order.id === world.questId)
  if (!order) return
  const useful = (id: string) => {
    if (id === 'cart') return world.drones.some(cart => cart.capacity < order.qty * kettlewick.recipe.ore)
    if (id === 'hopper') return order.item === 'steel' && world.drones.some(cart => cart.capacity > (world.furnace.coalMax ?? 0))
    if (id === 'furnace') return world.furnace.readyAt !== null && world.furnace.input >= kettlewick.recipe.ore
    return id === 'cpu' && world.cpu.used >= world.cpu.limit
  }
  const item = shop.find(item => !world.bought.includes(item.id) && item.price <= world.credits && useful(item.id))
  if (item && !session.buy(item.id)) throw new Error(`Shop refused ${item.name} at tick ${world.tick}.`)
  return item
}
