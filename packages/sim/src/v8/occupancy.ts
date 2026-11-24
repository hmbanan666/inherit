import type { Cell, Drone, World } from './core/world'
import { stationAt, stationLabel, type StationId } from './modules/stock'

/** Ticks a drone waits on one occupied cell before the engine looks for a way around. */
export const occupancyWaitTicks = 3

export interface CellClaim { x: number; y: number; until: number }

interface Slot {
  next?: Cell
  goal: Cell
  stopAt: number
  useClaim: boolean
  stepped: boolean
}

const limits = new WeakMap<World, (cell: Cell) => boolean>()
const pending = new WeakMap<World, Map<string, Slot>>()
const separatedOn = new WeakMap<World, number>()

/** Tests build a corridor by naming the cells a cart may enter. The floor has no walls. */
export function setWalkLimit(world: World, allowed: ((cell: Cell) => boolean) | null) {
  if (allowed) limits.set(world, allowed)
  else limits.delete(world)
}

export function droneRank(name: string) {
  const match = /(\d+)$/.exec(name)
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER
}

function key(cell: Cell) { return `${cell.x},${cell.y}` }
function same(a: Cell, b: Cell) { return a.x === b.x && a.y === b.y }
function manhattan(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }

function walkable(world: World, cell: Cell) {
  if (cell.x < 0 || cell.y < 0 || cell.x >= world.grid.width || cell.y >= world.grid.height) return false
  const extra = limits.get(world)
  return extra ? extra(cell) : true
}

function neighbours(cell: Cell): Cell[] {
  return [
    { x: cell.x, y: cell.y - 1 },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x + 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
  ]
}

function claims(world: World) {
  return world.cellClaims ??= []
}

function claimLive(claim: CellClaim, tick: number) {
  return tick <= claim.until
}

function droneAt(world: World, cell: Cell, except?: Drone) {
  return world.drones.find(drone => drone !== except && same(drone.pos, cell))
}

function slots(world: World) {
  let map = pending.get(world)
  if (!map) {
    map = new Map()
    pending.set(world, map)
  }
  return map
}

function reserved(world: World, cell: Cell) {
  return claims(world).some(item => item.x === cell.x && item.y === cell.y && claimLive(item, world.tick))
}

function canEnter(world: World, drone: Drone, cell: Cell, useClaim: boolean) {
  if (!walkable(world, cell)) return false
  if (droneAt(world, cell, drone)) return false
  if (useClaim) return true
  return !reserved(world, cell)
}

/** True when the cell is on the map, empty, and not reserved. */
export function cellOpen(world: World, cell: Cell) {
  return canEnter(world, { pos: cell } as Drone, cell, false)
}

/** Claim a free cell until a drone steps on it, or for `occupancyWaitTicks` ticks. */
export function claimCell(world: World, cell: Cell) {
  if (!cellOpen(world, cell)) return false
  claims(world).push({ x: cell.x, y: cell.y, until: world.tick + occupancyWaitTicks - 1 })
  return true
}

function nearestOpen(world: World, origin: Cell, taken: Set<string>) {
  const seen = new Set<string>([key(origin)])
  const queue: Cell[] = []
  const push = (cell: Cell) => {
    const id = key(cell)
    if (seen.has(id) || !walkable(world, cell)) return
    seen.add(id)
    queue.push(cell)
  }
  for (const next of neighbours(origin)) push(next)
  while (queue.length) {
    const here = queue.shift()!
    if (!taken.has(key(here))) return here
    for (const next of neighbours(here)) push(next)
  }
}

/** The lower drone id keeps its cell. Anyone sharing it steps to the nearest free cell. */
export function separateDrones(world: World) {
  const ranked = [...world.drones].sort((a, b) => droneRank(a.name) - droneRank(b.name) || a.name.localeCompare(b.name))
  const taken = new Set<string>()
  for (const drone of ranked) {
    if (walkable(world, drone.pos) && !taken.has(key(drone.pos))) {
      taken.add(key(drone.pos))
      continue
    }
    const spot = nearestOpen(world, drone.pos, taken)
    if (spot && !same(spot, drone.pos)) {
      drone.pos = spot
      drone.wait = null
      drone.avoid = null
      drone.route = undefined
    }
    taken.add(key(drone.pos))
  }
}

function ensureSeparated(world: World) {
  if (separatedOn.get(world) === world.tick) return
  separatedOn.set(world, world.tick)
  separateDrones(world)
}

/** One cell toward the goal. X first, then Y, skipping a cell the cart cannot enter. */
export function greedyStep(world: World, pos: Cell, goal: Cell) {
  const dx = Math.sign(goal.x - pos.x)
  const dy = Math.sign(goal.y - pos.y)
  const towardX = { x: pos.x + dx, y: pos.y }
  const towardY = { x: pos.x, y: pos.y + dy }
  const ordered = dx !== 0 ? [towardX, towardY] : [towardY]
  for (const step of ordered) {
    if (same(step, pos)) continue
    if (walkable(world, step)) return step
  }
  return null
}

function routeFrom(pos: Cell, target: Cell, stopAt: number) {
  const rest: Cell[] = []
  let cursor = { x: pos.x, y: pos.y }
  while (manhattan(cursor, target) > stopAt) {
    const sx = Math.sign(target.x - cursor.x)
    const sy = sx === 0 ? Math.sign(target.y - cursor.y) : 0
    cursor = { x: cursor.x + sx, y: cursor.y + sy }
    rest.push({ x: cursor.x, y: cursor.y })
  }
  return rest.length ? rest : undefined
}

function enter(world: World, drone: Drone, pos: Cell, goal: Cell, stopAt: number) {
  drone.pos = { x: pos.x, y: pos.y }
  drone.wait = null
  drone.route = routeFrom(pos, goal, stopAt)
  const list = claims(world)
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]!.x === pos.x && list[i]!.y === pos.y) list.splice(i, 1)
  }
  const slot = slots(world).get(drone.name)
  if (slot) slot.stepped = true
  else slots(world).set(drone.name, { goal, stopAt, useClaim: false, stepped: true })
}

function placePhrase(world: World, blocked: Cell, goal: Cell) {
  const station = stationAt(world, blocked) ?? stationAt(world, goal)
  if (station) return `the ${stationLabel[station].toLowerCase()}`
  const vein = world.veins.find(item => !item.hidden && same(item.pos, blocked))
    ?? world.veins.find(item => !item.hidden && same(item.pos, goal))
  if (vein) return `Vein ${vein.name}`
  const spots: { phrase: string; pos: Cell }[] = []
  const add = (id: StationId, pos?: Cell) => {
    if (pos) spots.push({ phrase: `the ${stationLabel[id].toLowerCase()}`, pos })
  }
  add('furnace', world.furnace.pos)
  add('depot', world.depot.pos)
  if (world.press) add('press', world.press.pos)
  if (world.spare) add('spare', world.spare.pos)
  if (world.lathe) add('lathe', world.lathe.pos)
  if (world.bench) add('bench', world.bench.pos)
  for (const item of world.veins) if (!item.hidden) spots.push({ phrase: `Vein ${item.name}`, pos: item.pos })
  spots.sort((a, b) => manhattan(blocked, a.pos) - manhattan(blocked, b.pos) || a.phrase.localeCompare(b.phrase))
  return spots[0]?.phrase ?? 'the works'
}

/**
 * Try to step onto `next`. A free cell is taken at once. An occupied cell is left for
 * `settleOccupancy`. `useClaim` is for `moveAlong`, which may enter a cell the player reserved.
 */
export function takeStep(world: World, drone: Drone, next: Cell, goal: Cell, stopAt: number, useClaim: boolean) {
  ensureSeparated(world)
  if (manhattan(drone.pos, goal) <= stopAt) {
    const slot = slots(world).get(drone.name)
    if (slot) slot.stepped = true
    drone.route = undefined
    drone.wait = null
    drone.avoid = null
    return false
  }
  slots(world).set(drone.name, { next, goal, stopAt, useClaim, stepped: false })
  if (!canEnter(world, drone, next, useClaim)) {
    drone.route = routeFrom(drone.pos, goal, stopAt)
    return false
  }
  enter(world, drone, next, goal, stopAt)
  return true
}

function yieldSpot(world: World, drone: Drone, away: Cell) {
  const axisX = Math.sign(away.x - drone.pos.x)
  const axisY = Math.sign(away.y - drone.pos.y)
  const scored = neighbours(drone.pos).flatMap(cell => {
    if (!canEnter(world, drone, cell, false)) return []
    const dot = (cell.x - drone.pos.x) * axisX + (cell.y - drone.pos.y) * axisY
    const kind = dot === 0 ? 0 : dot < 0 ? 1 : 2
    return kind < 2 ? [{ cell, kind }] : []
  })
  scored.sort((a, b) => a.kind - b.kind || a.cell.y - b.cell.y || a.cell.x - b.cell.x)
  return scored[0]?.cell
}

function findCycles(world: World) {
  const cycles: Drone[][] = []
  const seen = new Set<string>()
  for (const start of world.drones) {
    if (seen.has(start.name)) continue
    const chain: Drone[] = []
    const local = new Set<string>()
    let cursor: Drone | undefined = start
    while (cursor && !local.has(cursor.name)) {
      const slot = slots(world).get(cursor.name)
      if (!slot?.next || slot.stepped) break
      local.add(cursor.name)
      chain.push(cursor)
      const occupant = droneAt(world, slot.next, cursor)
      if (!occupant) break
      if (local.has(occupant.name)) {
        const at = chain.findIndex(drone => drone.name === occupant.name)
        const cycle = chain.slice(at)
        for (const drone of cycle) seen.add(drone.name)
        cycles.push(cycle)
        break
      }
      cursor = occupant
    }
  }
  return cycles
}

function advanceWaiting(world: World) {
  const waiting = world.drones.filter(drone => {
    const slot = slots(world).get(drone.name)
    return !!slot?.next && !slot.stepped && canEnter(world, drone, slot.next, slot.useClaim)
  }).sort((a, b) => droneRank(a.name) - droneRank(b.name) || a.name.localeCompare(b.name))
  for (const drone of waiting) {
    const slot = slots(world).get(drone.name)
    if (!slot?.next || slot.stepped || !canEnter(world, drone, slot.next, slot.useClaim)) continue
    enter(world, drone, slot.next, slot.goal, slot.stopAt)
  }
}

function resolveCycles(world: World) {
  for (let guard = 0; guard <= world.drones.length; guard++) {
    const found = findCycles(world)
    if (!found.length) return
    let moved = false
    for (const cycle of found) {
      const ordered = [...cycle].sort((a, b) => droneRank(a.name) - droneRank(b.name) || a.name.localeCompare(b.name))
      for (const drone of ordered) {
        const slot = slots(world).get(drone.name)
        if (!slot?.next || slot.stepped) continue
        const spot = yieldSpot(world, drone, slot.next)
        if (!spot) continue
        enter(world, drone, spot, slot.goal, slot.stopAt)
        moved = true
        break
      }
      if (moved) break
    }
    if (!moved) return
    advanceWaiting(world)
  }
}

function detour(world: World, drone: Drone, blocked: Cell, goal: Cell, stopAt: number) {
  const success = (cell: Cell) => manhattan(cell, goal) <= stopAt && !same(cell, blocked) && canEnter(world, drone, cell, false)
  const prev = new Map<string, string | null>()
  const queue: Cell[] = [drone.pos]
  prev.set(key(drone.pos), null)
  let found: Cell | undefined
  while (queue.length && !found) {
    const here = queue.shift()!
    for (const next of neighbours(here)) {
      const id = key(next)
      if (prev.has(id) || same(next, blocked)) continue
      if (!canEnter(world, drone, next, false)) continue
      prev.set(id, key(here))
      if (success(next)) {
        found = next
        break
      }
      queue.push(next)
    }
  }
  if (!found) return
  let cursor = found
  let parent = prev.get(key(cursor))
  while (parent && parent !== key(drone.pos)) {
    const [x, y] = parent.split(',').map(Number)
    cursor = { x: x!, y: y! }
    parent = prev.get(parent)
  }
  return cursor
}

/**
 * The cell to step to. While `drone.avoid` is still occupied, keep walking around it
 * instead of stepping back onto the blocked line.
 */
export function aroundStep(world: World, drone: Drone, goal: Cell, stopAt: number, preferred: Cell | null) {
  if (drone.avoid && !droneAt(world, drone.avoid)) drone.avoid = null
  if (!drone.avoid) return preferred
  return detour(world, drone, drone.avoid, goal, stopAt) ?? preferred
}

/** Break swaps, let a freed cell fill, then count waits and try a detour. */
export function settleOccupancy(world: World) {
  ensureSeparated(world)
  resolveCycles(world)
  advanceWaiting(world)
  const notes: string[] = []
  for (const drone of world.drones) {
    const slot = slots(world).get(drone.name)
    if (!slot || slot.stepped || !slot.next) {
      if (!slot?.stepped) drone.wait = null
      continue
    }
    const place = placePhrase(world, slot.next, slot.goal)
    const prev = drone.wait
    const sameBlock = !!prev && same(prev.blocked, slot.next)
    const ticks = sameBlock ? prev.ticks + 1 : 1
    const logged = sameBlock ? prev.logged : 0
    drone.waited = (drone.waited ?? 0) + 1
    drone.wait = { ticks, blocked: { x: slot.next.x, y: slot.next.y }, place, logged }
    if (ticks >= occupancyWaitTicks) {
      const side = detour(world, drone, slot.next, slot.goal, slot.stopAt)
      if (side) {
        if (ticks === occupancyWaitTicks && logged !== ticks)
          notes.push(`${drone.name} waited ${ticks} ticks at ${place}`)
        drone.avoid = { x: slot.next.x, y: slot.next.y }
        enter(world, drone, side, slot.goal, slot.stopAt)
        continue
      }
    }
    if (ticks === occupancyWaitTicks && drone.wait.logged !== ticks) {
      notes.push(`${drone.name} waited ${ticks} ticks at ${place}`)
      drone.wait = { ...drone.wait, logged: ticks }
    }
  }
  world.cellClaims = claims(world).filter(item => claimLive(item, world.tick))
  slots(world).clear()
  return notes
}
