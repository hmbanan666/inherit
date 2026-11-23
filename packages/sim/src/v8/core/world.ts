import { awaitingFirstDelivery, updateOrders, type ScheduledOrder, type Order } from '../modules/orders'
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
  loanAdvance: number
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
  creditChange: number
  status: string
  ledger: { income: number; rent: number; fuel: number; loan: number; debtTicks: number }
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
    orders: [], status: 'Haul ore to the furnace and ship the ingots.', creditChange: 0, ledger: { income: 0, rent: 0, fuel: 0, loan: 0, debtTicks: 0 }, bankrupt: false, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [],
  }
  updateOrders(world, site)
  return world
}

function drawLoan(world: World, site: Site) {
  const advance = site.loanAdvance - Math.min(0, world.credits)
  world.ledger.loan += advance
  world.credits += advance
}

export function continueWithLoan(world: World, site: Site) {
  if (!world.bankrupt) return
  drawLoan(world, site)
  world.bankrupt = false
  world.ledger.debtTicks = 0
  world.status = 'Uncle covered the shortfall. Check fuel costs and ship your next order.'
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count && !world.bankrupt; i++) {
    const balance = world.credits
    const before = world.drones.map(({ pos, cargo }) => ({ pos, cargo }))
    world.status = ''
    world.tick++
    updateOrders(world, site)
    finishBatch(world, site)
    world.ledger.rent += site.rentPerTick
    world.credits -= site.rentPerTick
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    const opening = awaitingFirstDelivery(world)
    if (world.credits < 0 && opening) drawLoan(world, site)
    world.ledger.debtTicks = world.credits < 0 ? world.ledger.debtTicks + 1 : 0
    world.bankrupt = world.ledger.debtTicks >= site.bankruptcyTicks
    world.creditChange = world.credits - balance
    const idle = world.drones.find((d, i) => d.pos.x === before[i].pos.x && d.pos.y === before[i].pos.y && d.cargo === before[i].cargo)
    const late = world.orders.find(o => o.status === 'overdue')
    if (world.bankrupt) world.status = 'The works are bankrupt. Continue with a loan or start over.'
    else if (world.credits < 0) world.status = `Credits below zero: bankrupt in ${site.bankruptcyTicks - world.ledger.debtTicks} ticks. Fill an order or cut costs.`
    else if (used >= site.cpuLimit) world.status = 'CPU at its limit. Save paths in memory to spend less per tick.'
    else if (message) world.status = message.text
    else if (opening && world.ledger.loan) world.status = `Uncle’s bank covered the shortfall. ${world.status || "Rent is due every tick. Ship the first order to earn credits."}`
    else if (late) world.status = `${late.from}’s order is late. Ship the remaining ingots to collect the reduced payout.`
    else if (!world.status && idle) world.status = `${idle.name} is idle. Give it a move, mine or unload action in onTick.`
    else if (!world.status) world.status = 'The drone is hauling ore. Ship the ingots when they are ready.'
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
