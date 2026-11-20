import type { Belt, Factory, Item, Layout, Level, Machine, World } from './types'
export type * from './types'
export * from './levels'
export * from './layout'

export const TICK_MS = 250
export const BELT_LENGTH = 5
const TICKS_PER_MINUTE = 60_000 / TICK_MS
const recipes = { furnace: ['ore'], assembler: ['ingot', 'coal'] } as const
export function createWorld(level: Level, layout: Layout = level.layout): World {
  return {
    level, tick: 0, shipped: 0, lost: 0, deliveries: [],
    machines: layout.stations.map(m => ({ ...m, queue: [], remaining: 0, status: 'idle', activeTicks: 0, processed: 0 })),
    belts: layout.links.map(link => ({ ...link, items: [] })),
  }
}
function feed(belt: Belt | undefined, kind: Item) {
  if (!belt || belt.items.some(i => i.position === 0)) return false
  belt.items.push({ kind, position: 0 })
  return true
}
function factory(world: World): Factory {
  const machine = (id: string) => world.machines.find(m => m.id === id)
  const belt = (id: string, target?: string) => world.belts.find(b => b.from === id && (!target || b.to === target))
  const dug = new Set<string>()
  return {
    tick: world.tick,
    dig(id) {
      const m = machine(id)
      if (!m || (m.kind !== 'mine' && m.kind !== 'coal') || dug.has(id)) return false
      dug.add(id)
      if (feed(belt(id), m.kind === 'mine' ? 'ore' : 'coal')) {
        m.status = 'working'
        m.processed++
        return true
      }
      world.lost++
      m.status = 'blocked'
      return false
    },
    work(id) {
      const m = machine(id)
      if (!m || (m.kind !== 'assembler' && m.kind !== 'furnace') || m.remaining || m.output) return false
      const recipe = recipes[m.kind]
      if (!recipe.every(item => m.queue.includes(item))) return false
      for (const item of recipe) m.queue.splice(m.queue.indexOf(item), 1)
      m.remaining = m.kind === 'assembler' ? 5 : 4
      return true
    },
    route(id, target) {
      const m = machine(id)
      if (m?.kind !== 'splitter' || !m.queue[0] || !feed(belt(id, target), m.queue[0])) return false
      m.queue.shift()
      m.status = 'working'
      m.processed++
      return true
    },
    space(id, target) {
      const b = belt(id, target)
      return !!b && !b.items.some(i => i.position === 0)
    },
    stock(id, item) { return machine(id)?.queue.filter(i => !item || i === item).length ?? 0 },
  }
}
function advanceBelts(world: World) {
  for (const belt of world.belts) {
    const destination = world.machines.find(m => m.id === belt.to)!
    // Each material has its own bin, so a full coal hopper cannot lock out iron.
    let ahead = BELT_LENGTH
    belt.items = belt.items.filter(item => {
      if (item.position === BELT_LENGTH - 1 && destination.queue.filter(i => i === item.kind).length < 3) {
        destination.queue.push(item.kind)
        return false
      }
      item.position = Math.min(item.position + 1, ahead - 1)
      ahead = item.position
      return true
    })
  }
}
function processMachine(world: World, m: Machine) {
  if (m.kind === 'dispatch') {
    if (world.tick % world.level.dockInterval === 0 && m.queue[0] === world.level.product) {
      m.queue.shift()
      world.shipped++
      world.deliveries.push(world.tick)
      m.processed++
      m.status = 'working'
    } else m.status = m.queue.length ? 'ready' : 'idle'
  }
  if (m.kind === 'furnace' || m.kind === 'assembler') {
    if (m.remaining > 0) {
      m.status = 'working'
      if (--m.remaining === 0) {
        m.output = m.kind === 'furnace' ? 'ingot' : 'part'
        m.processed++
      }
    } else m.status = recipes[m.kind].every(i => m.queue.includes(i)) ? 'ready' : 'starved'
    if (m.output) {
      if (feed(world.belts.find(b => b.from === m.id), m.output)) delete m.output
      else m.status = 'blocked'
    }
  }
  if (m.status === 'working') m.activeTicks++
}
/** Advance a single fixed tick. Only the caller's world is modified. */
export function step(world: World, onTick: (ctx: Factory) => void) {
  world.tick++
  advanceBelts(world)
  for (const m of world.machines) m.status = 'idle'
  onTick(factory(world))
  for (const m of world.machines) processMachine(world, m)
  world.deliveries = world.deliveries.filter(t => t > world.tick - TICKS_PER_MINUTE)
}
export function idlePercent(world: World, m: Machine) {
  return world.tick ? Math.round(100 * (1 - m.activeTicks / world.tick)) : 100
}
export function metrics(world: World) {
  const furnaces = world.machines.filter(m => m.kind === 'furnace')
  return {
    rate: Math.round(world.deliveries.length * TICKS_PER_MINUTE / Math.max(1, Math.min(world.tick, TICKS_PER_MINUTE))),
    idle: Math.max(...furnaces.map(m => idlePercent(world, m))),
    stock: world.machines.reduce((sum, m) => sum + m.queue.length, 0),
    progress: Math.min(1, world.shipped / world.level.order),
  }
}
export interface Check { label: string; status: 'pass' | 'fail' | 'warn'; value: string }
export function evaluate(world: World): Check[] {
  const { level } = world
  const { rate, idle } = metrics(world)
  const check = (label: string, ok: boolean, value: string, pending = false): Check =>
    ({ label, status: ok ? 'pass' : pending ? 'warn' : 'fail', value })
  const ingots = world.machines.filter(m => m.kind === 'furnace').reduce((n, m) => n + m.processed, 0)
  const checks = [
    check('Extract iron ore', world.machines.some(m => m.kind === 'mine' && m.processed > 0), 'extractor'),
    check('Smelt the first ingot', ingots > 0, ingots + ' made'),
  ]
  if (level.minRate) checks.push(check('Sustain ' + level.minRate + '/min', rate >= level.minRate, rate + '/min'))
  if (level.maxIdle) checks.push(check('Each furnace idle ≤ ' + level.maxIdle + '%', idle <= level.maxIdle, idle + '%'))
  if (level.lossless) checks.push(check('Keep all extracted ore', world.lost === 0, world.lost + ' lost'))
  checks.push(check('Ship ' + level.order + ' ' + level.product + 's', world.shipped >= level.order, world.shipped + '/' + level.order, true))
  return checks
}
