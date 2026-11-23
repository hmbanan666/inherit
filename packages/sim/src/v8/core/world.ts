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
  repeatOrders?: boolean
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
  orderRoundAt: number
  orders: Order[]
  /** Sentences the village said when a request was paid. One line each, in order. */
  growth: string[]
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
    orderRoundAt: 0, orders: [], growth: [], status: '', creditsPerMinute: 0,
    ledger: { income: 0, waste: 0, payouts: [] }, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [],
  }
  updateOrders(world, site)
  world.status = describeWorks(world, site, world.drones.map(drone => ({ pos: { ...drone.pos }, cargo: drone.cargo })))
  return world
}

function describeWorks(world: World, site: Site, before: { pos: Cell; cargo: number }[]) {
  const ask = world.orders.find(order => order.status === 'open' || order.status === 'overdue')
  if (!ask) return world.growth.at(-1) ?? 'The village is quiet.'
  if (ask.status === 'overdue') return `${ask.from} is still waiting, and this request now pays half.`
  const drone = world.drones[0]
  const prior = before[0]
  const wasFull = !!drone && !!prior && prior.cargo >= drone.capacity
  const stuck = wasFull && drone.cargo >= drone.capacity && prior.pos.x === drone.pos.x && prior.pos.y === drone.pos.y
  if (stuck) return `${ask.from} is waiting. The cart is full, and the drone never comes back to the furnace. Send it when the cart is full.`
  if (world.furnace.output > 0) return `${ask.from} is waiting. Ingots are ready. Ship them.`
  if (world.furnace.readyAt !== null || world.furnace.input >= site.recipe.ore) return `${ask.from} is waiting. The furnace is working.`
  if (drone && drone.cargo >= drone.capacity) return `${ask.from} is waiting. The cart is full. The drone is heading to the furnace.`
  if (world.ledger.waste > 0) return `${ask.from} is waiting. Smelting an empty furnace reduces what this request pays. Smelt only when it has ${site.recipe.ore} ore.`
  return `${ask.from} is waiting. The drone is fetching ore for the furnace.`
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count; i++) {
    const balance = world.credits
    const before = world.drones.map(({ pos, cargo }) => ({ pos: { x: pos.x, y: pos.y }, cargo }))
    world.tick++
    updateOrders(world, site)
    finishBatch(world, site)
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    if (world.credits < balance) world.credits = balance
    const earned = world.credits - balance
    const minute = 60_000
    if (earned) world.ledger.payouts.push({ tick: world.tick, credits: earned })
    world.ledger.payouts = world.ledger.payouts.filter(p => (world.tick - p.tick) * site.tickMs < minute)
    const recent = world.ledger.payouts.reduce((total, p) => total + p.credits, 0)
    world.creditsPerMinute = recent * minute / Math.min(minute, world.tick * site.tickMs)
    if (message) world.status = message.text
    else if (used >= site.cpuLimit) world.status = 'CPU is at its limit. Keep a path in memory instead of calling findPath every tick.'
    else world.status = describeWorks(world, site, before)
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
