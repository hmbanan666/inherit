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
  credits: number
  tickMs: number
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
  creditsPerMinute: number
  status: string
  ledger: { income: number; waste: number; payouts: { tick: number; credits: number }[] }
  furnace: Site['furnace'] & { readyAt: number | null }
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
}
export function createWorld(site: Site): World {
  const { seed, credits, grid, drones, veins, depot, furnace } = structuredClone(site)
  const world: World = {
    tick: 0, seed, credits, grid, drones, veins, depot, furnace: { ...furnace, readyAt: null },
    orders: [], status: 'Haul ore to the furnace and ship the ingots.', creditsPerMinute: 0,
    ledger: { income: 0, waste: 0, payouts: [] }, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [],
  }
  updateOrders(world, site)
  return world
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count; i++) {
    const balance = world.credits
    const before = world.drones.map(({ pos, cargo }) => ({ pos, cargo }))
    world.status = ''
    world.tick++
    updateOrders(world, site)
    finishBatch(world, site)
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    const earned = world.credits - balance
    const minute = 60_000
    if (earned) world.ledger.payouts.push({ tick: world.tick, credits: earned })
    world.ledger.payouts = world.ledger.payouts.filter(p => (world.tick - p.tick) * site.tickMs < minute)
    const recent = world.ledger.payouts.reduce((total, p) => total + p.credits, 0)
    world.creditsPerMinute = recent * minute / Math.min(minute, world.tick * site.tickMs)
    const idle = world.drones.find((d, i) => d.pos.x === before[i].pos.x && d.pos.y === before[i].pos.y && d.cargo === before[i].cargo)
    const late = world.orders.find(o => o.status === 'overdue')
    if (used >= site.cpuLimit) world.status = 'CPU at its limit. Save paths in memory to spend less per tick.'
    else if (message) world.status = message.text
    else if (late) world.status = `${late.from}’s order is late. Ship the remaining ingots to collect the reduced payout.`
    else if (!world.status && idle) world.status = `${idle.name} is idle. Give it a move, mine or unload action in onTick.`
    else if (!world.status) world.status = 'The drone is hauling ore. Ship the ingots when they are ready.'
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
