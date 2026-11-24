import type { Order } from '../modules/orders'
import { finishBatch } from '../modules/smelting'
import { grantSecondDrone, syncQuest, type QuestDef } from '../quests'

export interface Cell { x: number; y: number }
export interface Drone {
  name: string
  pos: Cell
  cargo: number
  capacity: number
  carrying: 'ore' | 'coal' | 'ingot' | 'steel' | null
  source: string
  route?: Cell[]
  /** Ticks spent on the current rock. Null when the drone is not mining. */
  dig?: { vein: string; ticks: number } | null
}
export type Purity = 'poor' | 'normal' | 'rich'
export interface Vein {
  name: string
  pos: Cell
  kind: 'ore' | 'coal'
  purity: Purity
  ticksPerUnit: number
  yield: number
  hidden?: boolean
}

/** Poor is slow. Rich is faster and yields two rocks. Veins do not run out. */
export function purityRate(purity: Purity) {
  if (purity === 'rich') return { ticksPerUnit: 1, yield: 2 }
  if (purity === 'normal') return { ticksPerUnit: 2, yield: 1 }
  return { ticksPerUnit: 5, yield: 1 }
}

export function settleVein(input: {
  name: string
  pos: Cell
  kind?: 'ore' | 'coal'
  purity?: string
  hidden?: boolean
}): Vein {
  const purity: Purity = input.purity === 'rich' || input.purity === 'normal' || input.purity === 'poor'
    ? input.purity
    : input.name === 'C' ? 'rich' : 'poor'
  return {
    name: input.name,
    pos: { x: input.pos.x, y: input.pos.y },
    kind: input.kind === 'coal' ? 'coal' : 'ore',
    purity,
    ...purityRate(purity),
    hidden: input.hidden ?? false,
  }
}

/** Old saves stored a finite vein.left. Drop it and fill purity. A furnace without caps keeps 6 and 3. */
export function migrateWorld(world: World) {
  world.veins = world.veins.map(vein => settleVein(vein))
  if (!world.veins.some(vein => vein.purity === 'normal' || vein.name === 'D')) {
    const vein = settleVein({ name: 'D', pos: { x: 8, y: 3 }, kind: 'ore', purity: 'normal' })
    const rich = world.veins.findIndex(item => item.name === 'C')
    if (rich >= 0) world.veins.splice(rich, 0, vein)
    else world.veins.push(vein)
  }
  world.furnace.oreMax ??= 6
  world.furnace.coalMax ??= 3
  for (const drone of world.drones) if (drone.dig === undefined) drone.dig = null
  world.depot.ingots ??= 0
  world.depot.steel ??= 0
  world.manualRuns ??= 0
  world.pendingRuns ??= []
  world.jobs ??= {}
  world.inbox ??= { smelt: false, alloy: false, collect: false, clear: false, drones: {} }
  world.collectAt ??= null
  world.collectSpan ??= 0
  if (!world.automation) world.automation = { run: true, events: true, tick: true }
  if (world.ledger) delete (world.ledger as { waste?: number }).waste
  for (const order of world.orders ?? []) delete (order as { due?: number }).due
  delete (world as { holdTicks?: number }).holdTicks
  delete (world as { coalHold?: number }).coalHold
  const later = new Set(['elsie', 'harrow', 'tomas', 'pell', 'wen'])
  if (world.bought?.includes('drone') || world.cleared?.includes('odile') || later.has(world.questId ?? ''))
    grantSecondDrone(world)
  if (!world.signals) world.signals = {
    output: world.furnace.output,
    ingotsMade: world.ingotsMade,
    steelMade: world.steelMade,
    drones: Object.fromEntries(world.drones.map(drone => [drone.name, {
      cargo: drone.cargo, capacity: drone.capacity, idle: drone.cargo === 0 && !drone.route?.length,
    }])),
  }
  return world
}
export interface Site {
  id: string
  seed: number
  grid: { width: number; height: number }
  drones: Drone[]
  veins: Vein[]
  depot: { pos: Cell; ore: number; coal: number; ingots: number; steel: number }
  furnace: { pos: Cell; input: number; output: number; oreMax: number; coalMax: number }
  recipe: { ore: number; ingots: number; ticks: number }
  questList?: QuestDef[]
  credits: number
  tickMs: number
  cpuLimit: number
  costs: { read: 0; action: number; findPath: number }
  orePerMine: number
  files: Record<string, string>
}
export interface Message { tick: number; file: string; line: number; text: string; count?: number }
export interface ConsoleLine {
  seq: number
  tick: number
  text: string
  level: 'log' | 'info' | 'warn' | 'error'
  file?: string
  line?: number
  count?: number
}
export interface World {
  tick: number
  seed: number
  credits: number
  grid: Site['grid']
  drones: Drone[]
  veins: Vein[]
  depot: Site['depot']
  orders: Order[]
  /** Sentences the village said when a request was paid. One line each, in order. */
  growth: string[]
  status: string
  ledger: { income: number }
  furnace: Site['furnace'] & { readyAt: number | null; coal: number; steel: number; batch: 'ingot' | 'steel' | null }
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
  console: ConsoleLine[]
  xp: number
  level: number
  questId?: string
  cleared: string[]
  bought: string[]
  checks: { id: string; text: string; status: 'open' | 'green' }[]
  batchTicks?: number
  ingotsMade: number
  steelMade: number
  steelMark: number
  pathCallsTick: number
  pathWindow: number[]
  /** Tick of the last deploy, or of taking the quest. */
  checkSince: number
  /** Last progress key for each check, and the tick it last changed. */
  checkMoved: Record<string, { key: string; at: number }>
  /** Legacy saves set every flag. A fresh world starts with all of them off. */
  automation: { run: boolean; events: boolean; tick: boolean }
  manualRuns: number
  pendingRuns: { name: string; file: string; line: number }[]
  jobs: Record<string, { kind: 'mine' | 'unload'; vein?: string; left: number; total: number }>
  inbox: { smelt: boolean; alloy: boolean; collect: boolean; clear: boolean; drones: Record<string, 'mine' | 'unload' | 'dump'> }
  collectAt: number | null
  collectSpan: number
  signals: {
    output: number
    ingotsMade: number
    steelMade: number
    drones: Record<string, { cargo: number; capacity: number; idle: boolean }>
  }
}
export function createWorld(site: Site): World {
  const world: World = {
    tick: 0, seed: site.seed, credits: site.credits, grid: structuredClone(site.grid),
    drones: structuredClone(site.drones).map(drone => ({ ...drone, carrying: drone.carrying ?? null, source: drone.source ?? '', dig: null })),
    veins: site.veins.map(vein => settleVein(vein)),
    depot: structuredClone(site.depot),
    furnace: { ...structuredClone(site.furnace), readyAt: null, coal: 0, steel: 0, batch: null },
    orders: [], growth: [], status: '',
    ledger: { income: 0 }, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [], console: [],
    xp: 0, level: 1, cleared: [], bought: [], checks: [],
    automation: { run: false, events: false, tick: false },
    manualRuns: 0, pendingRuns: [], jobs: {}, inbox: { smelt: false, alloy: false, collect: false, clear: false, drones: {} },
    collectAt: null, collectSpan: 0,
    signals: { output: 0, ingotsMade: 0, steelMade: 0, drones: {} },
    ingotsMade: 0, steelMade: 0, steelMark: 0, pathCallsTick: 0, pathWindow: [],
    checkSince: 0, checkMoved: {},
  }
  world.depot.coal ??= 0
  world.depot.ingots ??= 0
  world.depot.steel ??= 0
  world.signals = {
    output: world.furnace.output,
    ingotsMade: world.ingotsMade,
    steelMade: world.steelMade,
    drones: Object.fromEntries(world.drones.map(drone => [drone.name, {
      cargo: drone.cargo, capacity: drone.capacity, idle: true,
    }])),
  }
  world.status = site.questList ? syncQuest(world, site) : (world.growth.at(-1) ?? 'The village is quiet.')
  return world
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count; i++) {
    const balance = world.credits
    world.tick++
    finishBatch(world, site)
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    if (world.credits < balance) world.credits = balance
    world.pathWindow.push(world.pathCallsTick)
    if (world.pathWindow.length > 8) world.pathWindow.shift()
    world.pathCallsTick = 0
    const questStatus = site.questList ? syncQuest(world, site) : undefined
    if (message) world.status = message.text
    else if (used >= world.cpu.limit) world.status = 'CPU is at its limit. Remember a path in memory instead of calling findPath every tick.'
    else if (questStatus) world.status = questStatus
    else world.status = world.growth.at(-1) ?? 'The village is quiet.'
    if (message) noteMessage(world, { ...message, tick: world.tick, count: 1 })
  }
}

const consoleCap = 80

function sameError(a: { text: string; file?: string; line?: number }, b: { text: string; file?: string; line?: number }) {
  return a.text === b.text && a.file === b.file && a.line === b.line
}

/** One line for a repeated error: `x 120` after the text, once it has happened again. */
export function repeatedLabel(text: string, count?: number) {
  return count && count > 1 ? `${text} x ${count}` : text
}

function noteMessage(world: World, message: Message) {
  const prior = world.messages.find(item => sameError(item, message))
  if (!prior) {
    world.messages.push(message)
    return
  }
  prior.count = (prior.count ?? 1) + 1
  prior.tick = message.tick
}

export function pushConsole(world: World, line: Omit<ConsoleLine, 'seq' | 'count'>) {
  const list = (world.console ??= [])
  if (line.level === 'error') {
    const prior = list.find(item => item.level === 'error' && sameError(item, line))
    if (prior) {
      prior.count = (prior.count ?? 1) + 1
      prior.tick = line.tick
      return
    }
  }
  const seq = (list.at(-1)?.seq ?? 0) + 1
  list.push({ ...line, seq, count: 1 })
  if (list.length > consoleCap) list.splice(0, list.length - consoleCap)
}

export function clearConsole(world: World) {
  world.console = []
}
