import { brick, type Brick, type TickContext } from '../core/bricks'
import { chargeCpu } from '../core/cpu'
import { pushConsole, type Cell, type Drone, type Site, type Vein, type World } from '../core/world'
import { functionUnlocked, unlockError } from '../quests'

export type OrderResult = 'started' | 'same' | 'full'

/** A cart with no kind recorded is ore, which is what older saves stored. */
function heldKind(drone: { cargo: number; carrying: Drone['carrying'] }): Drone['carrying'] {
  if (drone.carrying) return drone.carrying
  return drone.cargo > 0 ? 'ore' : null
}

function rawCargo(kind: Drone['carrying']) {
  return kind === 'ore' || kind === 'coal'
}

function cell(world: World, input: unknown): Cell {
  const value = input as Partial<Cell> | null
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' ||
    !Number.isInteger(value.x) || !Number.isInteger(value.y) ||
    value.x < 0 || value.x >= world.grid.width || value.y < 0 || value.y >= world.grid.height)
    throw new Error(`A cell needs x and y on the ${world.grid.width} by ${world.grid.height} map.`)
  return { x: value.x, y: value.y }
}

function distance(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }

function loadOf(drone: { cargo: number; capacity: number; carrying: Drone['carrying'] }) {
  if (!drone.cargo || !drone.carrying) return 'carries nothing'
  return `carries ${drone.carrying} ${drone.cargo}/${drone.capacity}`
}

function who(drone: { name: string; pos: Cell; cargo: number; capacity: number; carrying: Drone['carrying'] }) {
  return `${drone.name} at (${drone.pos.x},${drone.pos.y}) ${loadOf(drone)}`
}

function nearestName(world: World, pos: Cell) {
  const spots = [
    { name: 'Furnace', pos: world.furnace.pos, rank: 0 },
    { name: 'Depot', pos: world.depot.pos, rank: 1 },
    ...world.veins.filter(vein => !vein.hidden).map(vein => ({ name: `Vein ${vein.name}`, pos: vein.pos, rank: 2 })),
  ]
  spots.sort((a, b) => distance(pos, a.pos) - distance(pos, b.pos) || a.rank - b.rank || a.name.localeCompare(b.name))
  return spots[0]?.name ?? 'nowhere'
}

/** Drop ore or coal and cancel the task. Ingots and steel stay, and the call throws. An empty cart only cancels the task. */
export function dumpCargo(world: World, name: string) {
  const d = drone(world, name)
  if (d.cargo) {
    const held = heldKind(d)
    if (!rawCargo(held))
      throw new Error(`${d.name} carries ${held} ${d.cargo}/${d.capacity}. Only ore and coal can be dumped.`)
  }
  d.task = null
  d.route = undefined
  d.dig = null
  if (!d.cargo) return
  d.cargo = 0
  d.carrying = null
  d.source = ''
}

function stationAt(world: World, pos: Cell) {
  if (distance(pos, world.furnace.pos) === 0) return 'Furnace'
  if (distance(pos, world.depot.pos) === 0) return 'Depot'
}

function findPath({ world }: TickContext, from: unknown, to: unknown) {
  const start = cell(world, from), end = cell(world, to)
  let { x, y } = start
  const path: Cell[] = []
  // All cells are open. The site seed breaks ties between shortest routes.
  while (x !== end.x || y !== end.y) {
    if (x !== end.x && (y === end.y || (world.seed & 1))) x += Math.sign(end.x - x)
    else y += Math.sign(end.y - y)
    path.push({ x, y })
  }
  world.pathCallsTick += 1
  return path
}

function drone(world: World, name: unknown) {
  const found = world.drones.find(d => d.name === name)
  if (!found) throw new Error(`No drone named ${String(name)}. drones: ${world.drones.map(item => item.name).join(', ') || 'none'}.`)
  return found
}

function bindings(site: Site): Brick[] {
  const binding = (name: string, signature: string, doc: string, example: string, guest: string): Brick =>
    ({ name, signature, doc, example, since: '1.0', cost: site.costs.read, handler: { guest } })
  return [
    binding('tick', 'const tick: number', 'Current tick.', 'tick', 'export let tick = 0; state.clock(value => { tick = value })'),
    binding('memory', 'const memory: Record<string, any>', 'Data kept between ticks.', 'memory.route', 'export const memory = state.memory'),
    binding('depot', 'const depot: Depot', 'Ore and coal unloaded here. depot.ore and depot.coal.', 'drone.unload(depot)', `export const depot = Object.freeze({
      pos: Object.freeze(${JSON.stringify(site.depot.pos)}),
      get ore() { return api.depot_ore() },
      get coal() { return api.depot_coal() },
      get ingots() { return api.depot_ingots() },
      get steel() { return api.depot_steel() },
    })`),
  ]
}

function clearTask(d: Drone) {
  d.task = null
  d.route = undefined
}

/** Walk one cell toward target and stop `stopAt` cells away. The rest of the walk stays on `route` for the map. */
function stepToward(d: Drone, target: Cell, stopAt: number) {
  if (distance(d.pos, target) <= stopAt) {
    d.route = undefined
    return false
  }
  const dx = Math.sign(target.x - d.pos.x)
  const dy = dx === 0 ? Math.sign(target.y - d.pos.y) : 0
  d.pos = { x: d.pos.x + dx, y: d.pos.y + dy }
  const rest: Cell[] = []
  let cursor = { x: d.pos.x, y: d.pos.y }
  while (distance(cursor, target) > stopAt) {
    const sx = Math.sign(target.x - cursor.x)
    const sy = sx === 0 ? Math.sign(target.y - cursor.y) : 0
    cursor = { x: cursor.x + sx, y: cursor.y + sy }
    rest.push({ x: cursor.x, y: cursor.y })
  }
  d.route = rest.length ? rest : undefined
  return true
}

function digOnce(world: World, d: Drone, vein: Vein) {
  if (distance(d.pos, vein.pos) > 1)
    throw new Error(`${d.name} at (${d.pos.x},${d.pos.y}) ${loadOf(d)}; not next to Vein ${vein.name} (${vein.kind}); nearest: ${nearestName(world, d.pos)}`)
  const held = heldKind(d)
  if (d.cargo > 0 && held && held !== vein.kind) {
    if (!rawCargo(held))
      throw new Error(`${who(d)}; cart holds ${held}. Only ore and coal can be dumped.`)
    pushConsole(world, {
      tick: world.tick,
      text: `${d.name} dumped ${d.cargo} ${held} to mine ${vein.kind} at Vein ${vein.name}`,
      level: 'info',
    })
    d.cargo = 0
    d.carrying = null
    d.source = ''
    d.dig = null
  }
  if (d.cargo >= d.capacity)
    throw new Error(`${who(d)}; cart is full (${d.cargo}/${d.capacity}).`)
  if (!d.dig || d.dig.vein !== vein.name) d.dig = { vein: vein.name, ticks: 0 }
  d.dig.ticks += 1
  if (d.dig.ticks < vein.ticksPerUnit) return
  const amount = Math.min(vein.yield, d.capacity - d.cargo)
  d.cargo += amount
  d.carrying = vein.kind
  d.source = vein.name
  d.dig = null
}

function unloadOnce(world: World, d: Drone, target: Cell) {
  const { depot, furnace } = world
  const station = stationAt(world, target)
  if (!station)
    throw new Error(`${who(d)}; (${target.x},${target.y}) is not Depot or Furnace. Depot accepts ore and coal. Furnace accepts ore and coal.`)
  if (distance(d.pos, target) > 1)
    throw new Error(`${who(d)}; not next to ${station} (${target.x},${target.y}); ${station} accepts ore and coal; nearest: ${nearestName(world, d.pos)}`)
  if (!d.cargo)
    throw new Error(`${station} accepts ore and coal; ${d.name} at (${d.pos.x},${d.pos.y}) carries nothing`)
  const held = heldKind(d)
  if (!rawCargo(held)) {
    if (station !== 'Depot')
      throw new Error(`${who(d)}; cart holds ${held}. Unload ingots and steel at the depot.`)
    if (held === 'steel') depot.steel += d.cargo
    else depot.ingots += d.cargo
    d.cargo = 0
    d.carrying = null
    d.source = ''
    return
  }
  const kind = held === 'coal' ? 'coal' : 'ore'
  let moved = d.cargo
  if (station === 'Furnace') {
    const cap = kind === 'coal' ? (furnace.coalMax ?? 3) : (furnace.oreMax ?? 6)
    const sitting = kind === 'coal' ? furnace.coal : furnace.input
    const room = Math.max(0, cap - sitting)
    if (room <= 0)
      throw new Error(`${d.name} keeps ${d.cargo} ${kind}; Furnace is full (${sitting}/${cap} ${kind}). Wait for smelt() or unload at the depot.`)
    moved = Math.min(d.cargo, room)
    if (kind === 'coal') furnace.coal += moved
    else furnace.input += moved
  } else if (kind === 'coal') depot.coal = (depot.coal ?? 0) + moved
  else depot.ore += moved
  d.cargo -= moved
  if (d.cargo === 0) {
    d.carrying = null
    d.source = ''
  } else if (!d.carrying) d.carrying = 'ore'
}

function pickupOnce(world: World, d: Drone) {
  const furnace = world.furnace
  const kind = heldKind(d)
  const want = furnace.output > 0 ? 'ingot' : furnace.steel > 0 ? 'steel' : null
  if (!want) throw new Error(`${who(d)}; the furnace has no ingots or steel.`)
  if (kind && kind !== want)
    throw new Error(`${who(d)}; unload ${kind} first`)
  if (d.cargo >= d.capacity)
    throw new Error(`${who(d)}; cart is full (${d.cargo}/${d.capacity}).`)
  const room = d.capacity - d.cargo
  const moved = Math.min(room, want === 'ingot' ? furnace.output : furnace.steel)
  if (want === 'ingot') furnace.output -= moved
  else furnace.steel -= moved
  d.cargo += moved
  d.carrying = want
  d.source = 'furnace'
}

/** A new command replaces the task. The same command for the same target leaves it running. */
export function orderMine(world: World, name: string, veinName: string, since: number): OrderResult {
  const d = drone(world, name)
  const vein = world.veins.find(item => item.name === veinName && !item.hidden)
  if (!vein) throw new Error(`${who(d)}; no vein with that name.`)
  const held = heldKind(d)
  if (d.cargo > 0 && held && !rawCargo(held))
    throw new Error(`${who(d)}; cart holds ${held}. Only ore and coal can be dumped.`)
  if (d.cargo >= d.capacity && held === vein.kind) {
    if (d.task?.kind === 'mine') clearTask(d)
    return 'full'
  }
  if (d.task?.kind === 'mine' && d.task.vein === vein.name) return 'same'
  if (d.dig && d.dig.vein !== vein.name) d.dig = null
  d.task = { kind: 'mine', vein: vein.name, since }
  if (distance(d.pos, vein.pos) <= 1 && since >= world.tick) {
    digOnce(world, d, vein)
    if (d.cargo >= d.capacity) clearTask(d)
    else d.route = undefined
  }
  return 'started'
}

export function orderUnload(world: World, name: string, target: Cell, since: number): OrderResult {
  const d = drone(world, name)
  const station = stationAt(world, target)
  if (!station)
    throw new Error(`${who(d)}; (${target.x},${target.y}) is not Depot or Furnace. Depot accepts ore and coal. Furnace accepts ore and coal.`)
  if (!d.cargo)
    throw new Error(`${station} accepts ore and coal; ${d.name} at (${d.pos.x},${d.pos.y}) carries nothing`)
  const held = heldKind(d)
  if (held && !rawCargo(held) && station !== 'Depot')
    throw new Error(`${who(d)}; cart holds ${held}. Unload ingots and steel at the depot.`)
  const at = station === 'Furnace' ? 'furnace' : 'depot'
  if (d.task?.kind === 'unload' && d.task.at === at) return 'same'
  if (distance(d.pos, target) <= 1 && since >= world.tick) {
    clearTask(d)
    unloadOnce(world, d, target)
    return 'started'
  }
  d.dig = null
  d.task = { kind: 'unload', at, since }
  return 'started'
}

export function orderPickup(world: World, name: string, since: number): OrderResult {
  const d = drone(world, name)
  const held = heldKind(d)
  if (d.cargo > 0 && held && rawCargo(held))
    throw new Error(`${who(d)}; unload ${held} first`)
  const finished = world.furnace.output > 0 || world.furnace.steel > 0
  if (!finished && held !== 'ingot' && held !== 'steel')
    throw new Error(`${who(d)}; the furnace has no ingots or steel.`)
  if (d.task?.kind === 'pickup') return 'same'
  const adjacent = distance(d.pos, world.furnace.pos) <= 1
  if (adjacent && since >= world.tick && finished && d.cargo < d.capacity) {
    pickupOnce(world, d)
    d.dig = null
    if (d.cargo > 0) d.task = { kind: 'pickup', phase: 'deliver', since }
    else clearTask(d)
    return 'started'
  }
  d.dig = null
  const phase = (held === 'ingot' || held === 'steel') && (!finished || d.cargo >= d.capacity) ? 'deliver' : 'fetch'
  d.task = { kind: 'pickup', phase, since }
  return 'started'
}

function noteTask(world: World, text: string) {
  pushConsole(world, { tick: world.tick, text, level: 'error' })
}

/** One step of every drone task. A task given this tick waits until the next one. */
export function stepDroneTasks(world: World, site: Site, used: number) {
  const limit = world.cpu.limit
  const spend = (cost: number) => {
    const charge = chargeCpu(used, limit, cost)
    used = charge.used
    if (!charge.allowed) noteTask(world, `CPU limit (${limit}) hit.`)
    return charge.allowed
  }
  for (const d of world.drones) {
    const task = d.task
    if (!task || task.since >= world.tick) continue
    try {
      if (task.kind === 'mine') stepMine(world, site, d, task.vein, spend)
      else if (task.kind === 'unload') stepUnload(world, site, d, task.at, spend)
      else stepPickup(world, site, d, task, spend)
    } catch (error) {
      clearTask(d)
      noteTask(world, error instanceof Error ? error.message : String(error))
    }
  }
  return used
}

function stepMine(world: World, site: Site, d: Drone, veinName: string, spend: (cost: number) => boolean) {
  const vein = world.veins.find(item => item.name === veinName && !item.hidden)
  if (!vein) {
    clearTask(d)
    noteTask(world, `${d.name} has no vein to mine.`)
    return
  }
  if (distance(d.pos, vein.pos) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(d, vein.pos, 1)
    return
  }
  const held = heldKind(d)
  if (d.cargo >= d.capacity && held === vein.kind) {
    clearTask(d)
    return
  }
  if (!spend(site.costs.action)) return
  d.route = undefined
  digOnce(world, d, vein)
  if (d.cargo >= d.capacity) clearTask(d)
}

function stepUnload(world: World, site: Site, d: Drone, at: 'furnace' | 'depot', spend: (cost: number) => boolean) {
  if (!d.cargo) {
    clearTask(d)
    return
  }
  const target = at === 'furnace' ? world.furnace.pos : world.depot.pos
  if (distance(d.pos, target) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(d, target, 1)
    return
  }
  if (!spend(site.costs.action)) return
  unloadOnce(world, d, target)
  clearTask(d)
}

function stepPickup(world: World, site: Site, d: Drone, task: Extract<NonNullable<Drone['task']>, { kind: 'pickup' }>, spend: (cost: number) => boolean) {
  if (task.phase === 'fetch') {
    if (distance(d.pos, world.furnace.pos) > 1) {
      if (!spend(site.costs.action)) return
      stepToward(d, world.furnace.pos, 1)
      return
    }
    const finished = world.furnace.output > 0 || world.furnace.steel > 0
    if (!finished && d.cargo === 0) {
      clearTask(d)
      noteTask(world, `${d.name} found no ingots or steel.`)
      return
    }
    if (!finished || d.cargo >= d.capacity) {
      task.phase = 'deliver'
      return
    }
    if (!spend(site.costs.action)) return
    d.route = undefined
    pickupOnce(world, d)
    task.phase = 'deliver'
    return
  }
  if (!d.cargo) {
    clearTask(d)
    return
  }
  if (distance(d.pos, world.depot.pos) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(d, world.depot.pos, 1)
    return
  }
  if (!spend(site.costs.action)) return
  unloadOnce(world, d, world.depot.pos)
  clearTask(d)
}

export function mining(site: Site): Brick[] {
  const { read, action } = site.costs
  return [
    ...bindings(site),
    brick('cpu.used', 'used(): number', 'CPU spent this tick.', 'cpu.used()', read, ctx => ctx.cpuUsed()),
    brick('cpu.limit', 'readonly limit: number', 'CPU available per tick.', 'cpu.limit', read, ({ world }) => world.cpu.limit),
    brick('drones', 'function drones(): Drone[]', 'Read your drones.', 'drones()[0]', read, ctx => ctx.world.drones),
    brick('veins', 'function veins(): Vein[]', 'Read the known veins. purity is poor, normal, or rich. A vein does not run out.', 'veins()[0]', read, ctx => ctx.world.veins.filter(vein => !vein.hidden)),
    brick('prospect', 'function prospect(): void', 'Reveal the next hidden vein.', `// Opens the next hidden vein. Nothing happens if none is left.\nprospect()`, action, ({ world }) => {
      if (!functionUnlocked(world, 'prospect')) throw new Error(unlockError('prospect'))
      const vein = world.veins.find(item => item.hidden)
      if (vein) vein.hidden = false
    }),
    brick('findPath', 'function findPath(from: Cell, to: Cell): Cell[]', 'Cells to walk from here to the target.',
      `// The cells from the drone to the depot. Remember the array if you walk it again.\nfindPath(drone.pos, depot.pos)`, site.costs.findPath, findPath),
    brick('drone.isNear', 'isNear(target: Target): boolean', 'Within one cell of a target.', 'drone.isNear(depot)', read,
      ({ world }, name, pos) => distance(drone(world, name).pos, cell(world, pos)) <= 1),
    brick('drone.moveAlong', 'moveAlong(path: Cell[]): void', 'Walk one step along a saved route. Cancels the current task.',
      `// One cell along the path. The next call walks the next cell.\ndrone.moveAlong(memory.route)`, action, (ctx, name, path) => {
        const d = drone(ctx.world, name)
        d.task = null
        d.dig = null
        if (!Array.isArray(path)) throw new Error(`${who(d)}; moveAlong path is not an array of cells.`)
        const index = path.findIndex(p => distance(cell(ctx.world, p), d.pos) === 0)
        const next = path[index + 1]
        if (!next) return
        const pos = cell(ctx.world, next)
        const away = distance(d.pos, pos)
        if (away !== 1) throw new Error(`${who(d)}; next path cell (${pos.x},${pos.y}) is ${away} away.`)
        const cells = path.map(step => cell(ctx.world, step))
        d.pos = pos
        d.route = cells.slice(index + 1)
      }),
    brick('drone.cargoKind', "readonly cargoKind: 'ore' | 'coal' | 'ingot' | 'steel' | null", 'What the cart holds. ore, coal, ingot, steel, or null when cargo is 0.', 'drone.cargoKind', read, { guest: '' }),
    brick('drone.busy', 'readonly busy: boolean', 'True while the drone is carrying out a task.', 'drone.busy', read, { guest: '' }),
    brick('drone.task', "readonly task: 'mine' | 'unload' | 'pickup' | null", 'mine, unload, pickup, or null when the drone is free.', 'drone.task', read, { guest: '' }),
    brick('drone.dump', 'dump(): void', 'Empty ore or coal onto the ground and cancel the task. Ingots and steel stay in the cart. An empty cart only cancels the task.', 'drone.dump()', action, ({ world }, name) => {
      dumpCargo(world, String(name))
    }),
    brick('depot.ore', 'readonly ore: number', 'Ore sitting at the depot.', 'depot.ore', read, ({ world }) => world.depot.ore),
    brick('depot.coal', 'readonly coal: number', 'Coal sitting at the depot.', 'depot.coal', read, ({ world }) => world.depot.coal ?? 0),
    brick('depot.ingots', 'readonly ingots: number', 'Ingots waiting for a villager.', 'depot.ingots', read, ({ world }) => world.depot.ingots ?? 0),
    brick('depot.steel', 'readonly steel: number', 'Steel waiting for a villager.', 'depot.steel', read, ({ world }) => world.depot.steel ?? 0),
    brick('drone.mine', 'mine(vein: Vein): void', 'Walk to this vein and mine until the cart is full. The same vein keeps going. A different command replaces the task.', `// One call. The drone keeps mining after this returns.\nif (!drone.busy) drone.mine(veins()[0])`, action,
      (ctx, name, veinName) => { orderMine(ctx.world, String(name), String(veinName), ctx.world.tick) }),
    brick('drone.unload', 'unload(station: Target): void', 'Walk to the furnace or the depot and unload. The same place keeps going. A different command replaces the task.', `// Walk to the furnace and leave the cargo there.\nif (!drone.busy) drone.unload(furnace)`, action,
      (ctx, name, target) => { orderUnload(ctx.world, String(name), cell(ctx.world, target), ctx.world.tick) }),
    brick('drone.pickup', 'pickup(station: Target): void', 'Walk to the furnace, take ingots or steel, and unload them at the depot.', `// Pick up finished goods and carry them to the depot.\nif (!drone.busy) drone.pickup(furnace)`, action,
      (ctx, name, target) => {
        const d = drone(ctx.world, name)
        const pos = cell(ctx.world, target)
        if (distance(pos, ctx.world.furnace.pos) !== 0)
          throw new Error(`${who(d)}; pickup takes ingots or steel from the furnace.`)
        orderPickup(ctx.world, String(name), ctx.world.tick)
      }),
  ]
}

// The guest facade binds a drone's identity to its methods. Only bounded JSON
// crosses the sandbox bridge; entity lookup and all mutations happen above.
export function miningModule(bricks: Brick[]) {
  const source = bricks.flatMap(b => typeof b.handler === 'object' ? [b.handler.guest] : [])
  return [...source, `
    export const cpu = Object.freeze({ used: api.cpu_used, get limit() { return api.cpu_limit() } })
    export const veins = api.veins, findPath = api.findPath
    export function drones() {
      return api.drones().map(d => {
        const name = d.name
        return Object.assign(d, {
          cargoKind: d.carrying ?? null,
          busy: !!d.task,
          task: d.task ? d.task.kind : null,
          moveAlong: path => api.drone_moveAlong(name, path),
          isNear: target => api.drone_isNear(name, target.pos),
          mine: vein => api.drone_mine(name, vein.name),
          dump: () => api.drone_dump(name),
          unload: target => api.drone_unload(name, target.pos),
          pickup: target => api.drone_pickup(name, target.pos),
        })
      })
    }`].join('\n')
}
