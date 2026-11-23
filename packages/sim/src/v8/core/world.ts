import { updateOrders, type ScheduledOrder, type Order } from '../modules/orders'
import { finishBatch } from '../modules/smelting'
import { syncQuest, type QuestDef } from '../quests'

export interface Cell { x: number; y: number }
export interface Drone { name: string; pos: Cell; cargo: number; capacity: number; carrying: 'ore' | 'coal' | null; source: string }
export interface Vein { name: string; pos: Cell; left: number; kind: 'ore' | 'coal'; hidden?: boolean }
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
  questList?: QuestDef[]
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
  furnace: Site['furnace'] & { readyAt: number | null; coal: number; steel: number; oreAt: number | null; coalAt: number | null; batch: 'ingot' | 'steel' | null }
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
  xp: number
  level: number
  questId?: string
  cleared: string[]
  bought: string[]
  checks: { id: string; text: string; status: 'open' | 'green' }[]
  holdTicks: number
  batchTicks?: number
  ingotsMade: number
  steelMade: number
  steelMark: number
  oreAfterDry: number
  pathCallsTick: number
  pathWindow: number[]
}
export function createWorld(site: Site): World {
  const world: World = {
    tick: 0, seed: site.seed, credits: site.credits, grid: structuredClone(site.grid),
    drones: structuredClone(site.drones).map(drone => ({ ...drone, carrying: drone.carrying ?? null, source: drone.source ?? '' })),
    veins: structuredClone(site.veins).map(vein => ({ ...vein, kind: vein.kind ?? 'ore', hidden: vein.hidden ?? false })),
    depot: structuredClone(site.depot),
    furnace: { ...structuredClone(site.furnace), readyAt: null, coal: 0, steel: 0, oreAt: null, coalAt: null, batch: null },
    orderRoundAt: 0, orders: [], growth: [], status: '', creditsPerMinute: 0,
    ledger: { income: 0, waste: 0, payouts: [] }, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [],
    xp: 0, level: 1, cleared: [], bought: [], checks: [], holdTicks: 0,
    ingotsMade: 0, steelMade: 0, steelMark: 0, oreAfterDry: 0, pathCallsTick: 0, pathWindow: [],
  }
  if (!site.questList) updateOrders(world, site)
  world.status = site.questList
    ? syncQuest(world, site)
    : describeWorks(world, site, world.drones.map(drone => ({ pos: { ...drone.pos }, cargo: drone.cargo })))
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
    if (!site.questList) updateOrders(world, site)
    if (world.holdTicks > 0) {
      const furnace = world.furnace
      if (furnace.oreAt !== null && world.tick - furnace.oreAt > world.holdTicks) {
        furnace.input = 0
        furnace.oreAt = null
      }
      if (furnace.coalAt !== null && world.tick - furnace.coalAt > 8) {
        furnace.coal = 0
        furnace.coalAt = null
      }
    }
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
    world.pathWindow.push(world.pathCallsTick)
    if (world.pathWindow.length > 8) world.pathWindow.shift()
    world.pathCallsTick = 0
    const questStatus = site.questList ? syncQuest(world, site) : undefined
    if (message) world.status = message.text
    else if (used >= world.cpu.limit) world.status = 'CPU is at its limit. Remember a path in memory instead of calling findPath every tick.'
    else if (questStatus) world.status = questStatus
    else world.status = describeWorks(world, site, before)
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
