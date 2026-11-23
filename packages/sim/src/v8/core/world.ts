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
  cpuLimit: number
  costs: { read: 0; action: number; findPath: number }
  orePerMine: number
  files: Record<string, string>
}
export interface Message { tick: number; file: string; line: number; text: string }
export interface World {
  tick: number
  seed: number
  grid: Site['grid']
  drones: Drone[]
  veins: Vein[]
  depot: Site['depot']
  cpu: { used: number; limit: number }
  memory: Record<string, unknown>
  messages: Message[]
}
export function createWorld(site: Site): World {
  const { seed, grid, drones, veins, depot } = structuredClone(site)
  return { tick: 0, seed, grid, drones, veins, depot, cpu: { used: 0, limit: site.cpuLimit }, memory: {}, messages: [] }
}

interface TickResult { used: number; message?: Omit<Message, 'tick'> }
export function runTicks(world: World, count: number, onTick: () => TickResult) {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error('Expected a nonnegative tick count.')
  for (let i = 0; i < count; i++) {
    world.tick++
    world.cpu.used = 0
    const { used, message } = onTick()
    world.cpu.used = used
    if (message) world.messages.push({ tick: world.tick, ...message })
  }
}
