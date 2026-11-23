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
  rentPerTick: number
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
  furnace: Site['furnace'] & { readyAt: number | null }
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
}
export function createWorld(site: Site): World {
  const { seed, credits, grid, drones, veins, depot, furnace } = structuredClone(site)
  return { tick: 0, seed, credits, grid, drones, veins, depot, furnace: { ...furnace, readyAt: null }, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [] }
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, site: Site, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count; i++) {
    world.tick++
    finishBatch(world, site)
    world.credits -= site.rentPerTick
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
