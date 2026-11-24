import { brick, type Brick, type TickContext } from '../core/bricks'
import { chargeCpu } from '../core/cpu'
import { pushConsole, type Cell, type Drone, type Site, type Vein, type World } from '../core/world'
import { aroundStep, cellOpen, claimCell, greedyStep, settleOccupancy, takeStep } from '../occupancy'
import { functionUnlocked, notePartHaul, unlockError } from '../quests'
import { isItem, itemType, port, release, releaseTransfer, reserve, stationAt as stationIdAt, stationLabel } from './stock'

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
  clearTask(world, d)
  d.dig = null
  if (!d.cargo) return
  d.cargo = 0
  d.carrying = null
  d.source = ''
}

function stationAt(world: World, pos: Cell) {
  const id = stationIdAt(world, pos)
  if (id === 'furnace' || id === 'depot') return stationLabel[id]
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
      count: api.depot_count,
    })`),
  ]
}

function clearTask(world: World, d: Drone) {
  releaseTransfer(world, d)
  d.task = null
  d.route = undefined
}

export function cancelDroneTask(world: World, drone: Drone) {
  clearTask(world, drone)
}

/** Walk one cell toward target and stop `stopAt` cells away. An occupied cell waits. */
function stepToward(world: World, d: Drone, target: Cell, stopAt: number) {
  if (distance(d.pos, target) <= stopAt) {
    d.avoid = null
    takeStep(world, d, d.pos, target, stopAt, false)
    return false
  }
  const next = aroundStep(world, d, target, stopAt, greedyStep(world, d.pos, target))
  if (!next) return false
  return takeStep(world, d, next, target, stopAt, false)
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

/** Vein D ore counted at the depot stays in the stock. Another vein does not count. */
function creditSurvey(world: World, source: string, amount: number) {
  if (source !== 'D' || amount <= 0) return
  const order = world.orders.find(item => item.id === world.questId && (item.status === 'open' || item.status === 'overdue'))
  if (!order || order.item !== 'ore') return
  order.shipped = Math.min(order.qty, order.shipped + amount)
  if (order.shipped >= order.qty) order.status = 'ready'
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
    if (held === 'steel' || held === 'grate') notePartHaul(world, d.name)
    if (held) port(world, 'depot')?.add(held, d.cargo)
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
  else {
    depot.ore += moved
    if (station === 'Depot') creditSurvey(world, d.source, moved)
  }
  d.cargo -= moved
  if (d.cargo === 0) {
    d.carrying = null
    d.source = ''
  } else if (!d.carrying) d.carrying = 'ore'
}

function pickupOnce(world: World, d: Drone) {
  const furnace = port(world, 'furnace')
  if (!furnace) throw new Error(`${who(d)}; the furnace has no ingots or steel.`)
  const kind = heldKind(d)
  const want = furnace.free('ingot') > 0 ? 'ingot' : furnace.free('steel') > 0 ? 'steel' : null
  if (!want) throw new Error(`${who(d)}; the furnace has no ingots or steel.`)
  if (kind && kind !== want)
    throw new Error(`${who(d)}; unload ${kind} first`)
  if (d.cargo >= d.capacity)
    throw new Error(`${who(d)}; cart is full (${d.cargo}/${d.capacity}).`)
  const room = d.capacity - d.cargo
  const moved = Math.min(room, furnace.free(want))
  furnace.take(want, moved)
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
    if (d.task?.kind === 'mine') clearTask(world, d)
    return 'full'
  }
  if (d.task?.kind === 'mine' && d.task.vein === vein.name) return 'same'
  if (d.dig && d.dig.vein !== vein.name) d.dig = null
  releaseTransfer(world, d)
  d.task = { kind: 'mine', vein: vein.name, since }
  if (distance(d.pos, vein.pos) <= 1 && since >= world.tick) {
    digOnce(world, d, vein)
    if (d.cargo >= d.capacity) clearTask(world, d)
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
    clearTask(world, d)
    unloadOnce(world, d, target)
    return 'started'
  }
  d.dig = null
  releaseTransfer(world, d)
  d.task = { kind: 'unload', at, since }
  return 'started'
}

export function orderPickup(world: World, name: string, since: number): OrderResult {
  const d = drone(world, name)
  const held = heldKind(d)
  if (d.cargo > 0 && held && held !== 'ingot' && held !== 'steel')
    throw new Error(`${who(d)}; unload ${held} first`)
  const hopper = port(world, 'furnace')
  const finished = !!hopper && (hopper.free('ingot') > 0 || hopper.free('steel') > 0)
  if (!finished && held !== 'ingot' && held !== 'steel')
    throw new Error(`${who(d)}; the furnace has no ingots or steel.`)
  if (d.task?.kind === 'pickup') return 'same'
  const adjacent = distance(d.pos, world.furnace.pos) <= 1
  if (adjacent && since >= world.tick && finished && d.cargo < d.capacity) {
    releaseTransfer(world, d)
    pickupOnce(world, d)
    d.dig = null
    if (d.cargo > 0) d.task = { kind: 'pickup', phase: 'deliver', since }
    else clearTask(world, d)
    return 'started'
  }
  d.dig = null
  releaseTransfer(world, d)
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
      else if (task.kind === 'pickup') stepPickup(world, site, d, task, spend)
      else stepTransfer(world, site, d, task, spend)
    } catch (error) {
      clearTask(world, d)
      noteTask(world, error instanceof Error ? error.message : String(error))
    }
  }
  for (const text of settleOccupancy(world))
    pushConsole(world, { tick: world.tick, text, level: 'info' })
  return used
}

function stepMine(world: World, site: Site, d: Drone, veinName: string, spend: (cost: number) => boolean) {
  const vein = world.veins.find(item => item.name === veinName && !item.hidden)
  if (!vein) {
    clearTask(world, d)
    noteTask(world, `${d.name} has no vein to mine.`)
    return
  }
  if (distance(d.pos, vein.pos) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(world, d, vein.pos, 1)
    return
  }
  const held = heldKind(d)
  if (d.cargo >= d.capacity && held === vein.kind) {
    clearTask(world, d)
    return
  }
  if (!spend(site.costs.action)) return
  d.route = undefined
  digOnce(world, d, vein)
  if (d.cargo >= d.capacity) clearTask(world, d)
}

function stepUnload(world: World, site: Site, d: Drone, at: 'furnace' | 'depot', spend: (cost: number) => boolean) {
  if (!d.cargo) {
    clearTask(world, d)
    return
  }
  const target = at === 'furnace' ? world.furnace.pos : world.depot.pos
  if (distance(d.pos, target) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(world, d, target, 1)
    return
  }
  if (!spend(site.costs.action)) return
  unloadOnce(world, d, target)
  clearTask(world, d)
}

function stepPickup(world: World, site: Site, d: Drone, task: Extract<NonNullable<Drone['task']>, { kind: 'pickup' }>, spend: (cost: number) => boolean) {
  if (task.phase === 'fetch') {
    if (distance(d.pos, world.furnace.pos) > 1) {
      if (!spend(site.costs.action)) return
      stepToward(world, d, world.furnace.pos, 1)
      return
    }
    const hopper = port(world, 'furnace')
    const finished = !!hopper && (hopper.free('ingot') > 0 || hopper.free('steel') > 0)
    if (!finished && d.cargo === 0) {
      clearTask(world, d)
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
    clearTask(world, d)
    return
  }
  if (distance(d.pos, world.depot.pos) > 1) {
    if (!spend(site.costs.action)) return
    stepToward(world, d, world.depot.pos, 1)
    return
  }
  if (!spend(site.costs.action)) return
  unloadOnce(world, d, world.depot.pos)
  clearTask(world, d)
}

type TransferTask = Extract<NonNullable<Drone['task']>, { kind: 'transfer' }>

function actTransfer(world: World, d: Drone, task: TransferTask, walk: boolean, spend?: (cost: number) => boolean, cost = 1) {
  const place = task.phase === 'fetch' ? task.from : task.to
  const view = port(world, place)
  if (!view) {
    clearTask(world, d)
    noteTask(world, `${d.name} lost the ${stationLabel[place]}.`)
    return
  }
  if (distance(d.pos, view.pos) > 1) {
    if (!walk) return
    if (spend && !spend(cost)) return
    stepToward(world, d, view.pos, 1)
    return
  }
  if (task.phase === 'fetch') {
    const need = task.qty - task.picked
    const room = d.capacity - d.cargo
    if (need <= 0 || room <= 0) {
      task.phase = 'deliver'
      return
    }
    if (walk && spend && !spend(cost)) return
    const reserved = view.bin.reservedOut[task.item] ?? 0
    const moved = Math.min(need, room, view.get(task.item), reserved)
    if (moved <= 0) throw new Error(`${who(d)}; ${stationLabel[place]} has no ${task.item} reserved.`)
    view.set(task.item, view.get(task.item) - moved)
    release(view.bin.reservedOut, task.item, moved)
    d.cargo += moved
    d.carrying = task.item
    d.source = place
    task.picked += moved
    task.phase = 'deliver'
    d.route = undefined
    return
  }
  if (!d.cargo) {
    if (task.picked >= task.qty) clearTask(world, d)
    else task.phase = 'fetch'
    return
  }
  if (walk && spend && !spend(cost)) return
  const dropped = d.cargo
  release(view.bin.reservedIn, task.item, dropped)
  view.add(task.item, dropped)
  if (task.item === 'steel' || task.item === 'grate') notePartHaul(world, d.name)
  task.delivered += dropped
  d.cargo = 0
  d.carrying = null
  d.source = ''
  d.route = undefined
  if (task.delivered >= task.qty) clearTask(world, d)
  else task.phase = 'fetch'
}

function stepTransfer(world: World, site: Site, d: Drone, task: TransferTask, spend: (cost: number) => boolean) {
  actTransfer(world, d, task, true, spend, site.costs.action)
}

/** Reserve qty at `from` and space at `to`, then carry it. A new command releases both. */
export function orderTransfer(world: World, name: string, item: unknown, from: Cell, to: Cell, qty: unknown, since: number): OrderResult {
  const d = drone(world, name)
  if (!isItem(item)) throw new Error(`${who(d)}; unknown good ${String(item)}.`)
  if (typeof qty !== 'number' || !Number.isInteger(qty) || qty < 1)
    throw new Error(`${who(d)}; qty needs a whole number of goods.`)
  const sourceId = stationIdAt(world, from)
  const destId = stationIdAt(world, to)
  if (!sourceId || !destId)
    throw new Error(`${who(d)}; transfer runs between the depot, the furnace, and a machine.`)
  if (sourceId === destId) throw new Error(`${who(d)}; transfer needs two stations.`)
  if (d.task?.kind === 'transfer' && d.task.item === item && d.task.from === sourceId && d.task.to === destId && d.task.qty === qty)
    return 'same'
  const held = heldKind(d)
  if (d.cargo > 0) throw new Error(`${who(d)}; unload ${held} first`)
  const source = port(world, sourceId)
  const dest = port(world, destId)
  if (!source || !dest) throw new Error(`${who(d)}; ${stationLabel[sourceId === 'press' || destId === 'press' ? 'press' : sourceId]} is not installed.`)
  const returning = d.task?.kind === 'transfer' && d.task.item === item && d.task.from === sourceId ? d.task.qty - d.task.picked : 0
  const freeing = d.task?.kind === 'transfer' && d.task.item === item && d.task.to === destId ? d.task.qty - d.task.delivered : 0
  const available = source.free(item) + returning
  const space = Number.isFinite(dest.room(item)) ? dest.room(item) + freeing : dest.room(item)
  if (available < qty) throw new Error(`${who(d)}; ${stationLabel[sourceId]} has ${available} ${item} free.`)
  if (space < qty) throw new Error(`${who(d)}; ${stationLabel[destId]} has room for ${Math.max(0, space)} ${item}.`)
  releaseTransfer(world, d)
  reserve(source.bin.reservedOut, item, qty)
  reserve(dest.bin.reservedIn, item, qty)
  d.dig = null
  const task: TransferTask = { kind: 'transfer', item, from: sourceId, to: destId, qty, picked: 0, delivered: 0, phase: 'fetch', since }
  d.task = task
  if (since >= world.tick) actTransfer(world, d, task, false)
  return 'started'
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
    brick('isFree', 'function isFree(cell: Cell): boolean', 'True when the cell is on the map, no drone is standing on it, and nobody has reserved it.',
      `// True when the next cell is empty.\nisFree({ x: drone.pos.x + 1, y: drone.pos.y })`, read,
      ({ world }, pos) => cellOpen(world, cell(world, pos))),
    brick('reserve', 'function reserve(cell: Cell): boolean', 'Claim a free cell so other drones leave it alone. The claim lasts a few ticks, or until a drone steps on it. A quest never requires it.',
      `// Hold the next cell for this cart.\nif (isFree({ x: drone.pos.x + 1, y: drone.pos.y })) reserve({ x: drone.pos.x + 1, y: drone.pos.y })`, read,
      ({ world }, pos) => claimCell(world, cell(world, pos))),
    brick('drone.isNear', 'isNear(target: Target): boolean', 'Within one cell of a target.', 'drone.isNear(depot)', read,
      ({ world }, name, pos) => distance(drone(world, name).pos, cell(world, pos)) <= 1),
    brick('drone.moveAlong', 'moveAlong(path: Cell[]): void', 'Walk one step along a saved route. Cancels the current task. An occupied cell waits.',
      `// One cell along the path. The next call walks the next cell.\ndrone.moveAlong(memory.route)`, action, (ctx, name, path) => {
        const d = drone(ctx.world, name)
        clearTask(ctx.world, d)
        d.dig = null
        if (!Array.isArray(path)) throw new Error(`${who(d)}; moveAlong path is not an array of cells.`)
        const cells = path.map(step => cell(ctx.world, step))
        const goal = cells[cells.length - 1]
        if (!goal) return
        const index = cells.findIndex(step => distance(step, d.pos) === 0)
        let next: Cell | undefined
        if (index >= 0) {
          next = cells[index + 1]
          if (!next) {
            d.route = undefined
            d.wait = null
            d.avoid = null
            return
          }
          const away = distance(d.pos, next)
          if (away !== 1) throw new Error(`${who(d)}; next path cell (${next.x},${next.y}) is ${away} away.`)
        } else if (cells[0] && distance(d.pos, cells[0]) === 1) next = cells[0]
        else next = greedyStep(ctx.world, d.pos, cells.reduce((best, step) => distance(d.pos, step) < distance(d.pos, best) ? step : best)) ?? undefined
        next = aroundStep(ctx.world, d, goal, 0, next ?? null) ?? undefined
        if (!next) return
        const before = { ...d.pos }
        takeStep(ctx.world, d, next, goal, 0, true)
        if (distance(d.pos, before) === 0) d.route = cells.slice(index >= 0 ? index + 1 : 0)
        else if (distance(d.pos, next) === 0) d.route = cells.slice(index + 1)
      }),
    brick('drone.cargoKind', `readonly cargoKind: ${itemType} | null`, 'What the cart holds. Null when cargo is 0.', 'drone.cargoKind', read, { guest: '' }),
    brick('drone.busy', 'readonly busy: boolean', 'True while the drone is carrying out a task.', 'drone.busy', read, { guest: '' }),
    brick('drone.task', "readonly task: 'mine' | 'unload' | 'pickup' | 'transfer' | null", 'mine, unload, pickup, transfer, or null when the drone is free.', 'drone.task', read, { guest: '' }),
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
    brick('drone.transfer', `transfer(item: ${itemType}, from: Target, to: Target, qty: number): void`, 'Carry this many of one good from one station to another. Reserves the goods and the receiving space until the task ends.', `// Take 2 steel from the furnace to the press.\nif (!drone.busy) drone.transfer("steel", furnace, press, 2)`, action,
      (ctx, name, item, from, packed) => {
        // The guest call is limited to four host arguments, so the destination and qty travel together.
        const spec = Array.isArray(packed) ? packed : []
        orderTransfer(ctx.world, String(name), item, cell(ctx.world, from), cell(ctx.world, spec[0]), spec[1], ctx.world.tick)
      }),
  ]
}

// The guest facade binds a drone's identity to its methods. Only bounded JSON
// crosses the sandbox bridge; entity lookup and all mutations happen above.
export function miningModule(bricks: Brick[]) {
  const source = bricks.flatMap(b => typeof b.handler === 'object' ? [b.handler.guest] : [])
  return [...source, `
    export const cpu = Object.freeze({ used: api.cpu_used, get limit() { return api.cpu_limit() } })
    export const veins = api.veins, findPath = api.findPath, isFree = api.isFree, reserve = api.reserve
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
          transfer: (item, from, to, qty) => api.drone_transfer(name, item, from && from.pos, to && [to.pos, qty]),
        })
      })
    }`].join('\n')
}
