import { updateOrders, type ScheduledOrder, type Order } from '../modules/orders'
import { finishBatch } from '../modules/smelting'

export interface Cell { x: number; y: number }
export interface Drone { name: string; pos: Cell; cargo: number; capacity: number }
export interface Vein { name: string; pos: Cell; left: number }
export interface Site {
  id: string
  seed: number
  grid: { width: number; height: number }
  drones: Drone[]
  veins: Vein[]
  depot: { pos: Cell; ore: number }
  furnace: { pos: Cell; input: number; output: number }
  recipe: { ore: number; ingots: number; ticks: number; fuel: number }
  orderSchedule: ScheduledOrder[]
  graceTicks: number
  latePayFraction: number
  rentPerTick: number
  bankruptcyTicks: number
  credits: number
  tickMs: number
  speeds: readonly number[]
  cpuLimit: number
  costs: { read: 0; action: number; findPath: number }
  orePerMine: number
  files: Record<string, string>
}
export interface Message { tick: number; file: string; line: number; text: string }
export interface World {
  tick: number
  seed: number
  credits: number
  grid: Site['grid']
  drones: Drone[]
  veins: Vein[]
  depot: Site['depot']
  orders: Order[]
  ledger: { income: number; rent: number; debtTicks: number }
  bankrupt: boolean
  furnace: Site['furnace'] & { readyAt: number | null }
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
}
export function createWorld(site: Site): World {
  const { seed, credits, grid, drones, veins, depot, furnace } = structuredClone(site)
  const world: World = {
    tick: 0, seed, credits, grid, drones, veins, depot, furnace: { ...furnace, readyAt: null },
    orders: [], ledger: { income: 0, rent: 0, debtTicks: 0 }, bankrupt: false, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [],
  }
  updateOrders(world, site)
  return world
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count && !world.bankrupt; i++) {
    world.tick++
    updateOrders(world, site)
    finishBatch(world, site)
    world.ledger.rent += site.rentPerTick
    world.credits -= site.rentPerTick
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    world.ledger.debtTicks = world.credits < 0 ? world.ledger.debtTicks + 1 : 0
    world.bankrupt = world.ledger.debtTicks >= site.bankruptcyTicks
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
