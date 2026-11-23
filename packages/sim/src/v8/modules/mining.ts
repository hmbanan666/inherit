import { brick, type Brick, type TickContext } from '../core/bricks'
import type { Cell, Site, World } from '../core/world'

function cell(world: World, input: unknown): Cell {
  const value = input as Partial<Cell> | null
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' ||
    !Number.isInteger(value.x) || !Number.isInteger(value.y) ||
    value.x < 0 || value.x >= world.grid.width || value.y < 0 || value.y >= world.grid.height)
    throw new Error(`A cell needs x and y on the ${world.grid.width} by ${world.grid.height} map.`)
  return { x: value.x, y: value.y }
}

function distance(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }

function loadOf(drone: { cargo: number; capacity: number; carrying: 'ore' | 'coal' | null }) {
  if (!drone.cargo || !drone.carrying) return 'carries nothing'
  return `carries ${drone.carrying} ${drone.cargo}/${drone.capacity}`
}

function who(drone: { name: string; pos: Cell; cargo: number; capacity: number; carrying: 'ore' | 'coal' | null }) {
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
    })`),
  ]
}

export function mining(site: Site): Brick[] {
  const { read, action } = site.costs
  return [
    ...bindings(site),
    brick('cpu.used', 'used(): number', 'CPU spent this tick.', 'cpu.used()', read, ctx => ctx.cpuUsed()),
    brick('cpu.limit', 'readonly limit: number', 'CPU available per tick.', 'cpu.limit', read, ({ world }) => world.cpu.limit),
    brick('drones', 'function drones(): Drone[]', 'Read your drones.', 'drones()[0]', read, ctx => ctx.world.drones),
    brick('veins', 'function veins(): Vein[]', 'Read the known veins.', 'veins()[0]', read, ctx => ctx.world.veins.filter(vein => !vein.hidden)),
    brick('prospect', 'function prospect(): void', 'Reveal the next hidden vein. Sold in the shop.', 'prospect()', action, ({ world }) => {
      if (!world.bought.includes('prospect')) throw new Error('prospect is not bought. Prospect is in the shop.')
      const vein = world.veins.find(item => item.hidden)
      if (vein) vein.hidden = false
    }),
    brick('findPath', 'function findPath(from: Cell, to: Cell): Cell[]', 'Cells to walk from here to the target.',
      'findPath(drone.pos, depot.pos)', site.costs.findPath, findPath),
    brick('drone.isNear', 'isNear(target: Target): boolean', 'Within one cell of a target.', 'drone.isNear(depot)', read,
      ({ world }, name, pos) => distance(drone(world, name).pos, cell(world, pos)) <= 1),
    brick('drone.moveAlong', 'moveAlong(path: Cell[]): void', 'Walk one step along a saved route.',
      'drone.moveAlong(memory.route)', action, (ctx, name, path) => {
        const d = drone(ctx.world, name)
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
    brick('drone.cargoKind', "readonly cargoKind: 'ore' | 'coal' | null", 'The rock in the cart. ore, coal, or null when cargo is 0.', 'drone.cargoKind', read, { guest: '' }),
    brick('depot.ore', 'readonly ore: number', 'Ore sitting at the depot.', 'depot.ore', read, ({ world }) => world.depot.ore),
    brick('depot.coal', 'readonly coal: number', 'Coal sitting at the depot.', 'depot.coal', read, ({ world }) => world.depot.coal ?? 0),
    brick('drone.mine', 'mine(vein: Vein): void', 'Take one of this vein\'s kind into the cart. The cart holds one kind.', 'drone.mine(veins()[0])', action,
      (ctx, name, veinName) => {
        const d = drone(ctx.world, name)
        const vein = ctx.world.veins.find(v => v.name === veinName)
        if (!vein) throw new Error(`${who(d)}; no vein with that name.`)
        if (distance(d.pos, vein.pos) > 1)
          throw new Error(`${d.name} at (${d.pos.x},${d.pos.y}) ${loadOf(d)}; not next to Vein ${vein.name} (${vein.kind}); nearest: ${nearestName(ctx.world, d.pos)}`)
        if (!vein.left) throw new Error(`${who(d)}; Vein ${vein.name} (${vein.kind}) left 0.`)
        if (d.cargo > 0 && d.carrying && d.carrying !== vein.kind)
          throw new Error(`${who(d)}; Vein ${vein.name} gives ${vein.kind}; unload ${d.carrying} first (depot or furnace accept ${d.carrying})`)
        const amount = Math.min(site.orePerMine, vein.left, d.capacity - d.cargo)
        vein.left -= amount
        d.cargo += amount
        if (amount > 0) {
          d.carrying = vein.kind
          d.source = vein.name
        }
      }),
    brick('drone.unload', 'unload(station: Target): void', 'Leave cargo at a nearby depot or furnace. Both accept ore and coal.', 'drone.unload(depot)', action,
      (ctx, name, target) => {
        const d = drone(ctx.world, name), { depot, furnace } = ctx.world
        const pos = cell(ctx.world, target)
        const station = stationAt(ctx.world, pos)
        if (!station)
          throw new Error(`${who(d)}; (${pos.x},${pos.y}) is not Depot or Furnace. Depot accepts ore and coal. Furnace accepts ore and coal.`)
        if (distance(d.pos, pos) > 1)
          throw new Error(`${who(d)}; not next to ${station} (${pos.x},${pos.y}); ${station} accepts ore and coal; nearest: ${nearestName(ctx.world, d.pos)}`)
        if (!d.cargo)
          throw new Error(`${station} accepts ore and coal; ${d.name} at (${d.pos.x},${d.pos.y}) carries nothing`)
        if (station === 'Furnace') {
          if (d.carrying === 'coal') {
            furnace.coal += d.cargo
            furnace.coalAt = ctx.world.tick
          } else {
            furnace.input += d.cargo
            furnace.oreAt = ctx.world.tick
            const dry = ctx.world.veins.find(vein => vein.name === 'A')
            if (d.source && d.source !== 'A' && dry && dry.left === 0) ctx.world.oreAfterDry += d.cargo
          }
        } else if (d.carrying === 'coal') depot.coal = (depot.coal ?? 0) + d.cargo
        else depot.ore += d.cargo
        d.cargo = 0
        d.carrying = null
        d.source = ''
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
          moveAlong: path => api.drone_moveAlong(name, path),
          isNear: target => api.drone_isNear(name, target.pos),
          mine: vein => api.drone_mine(name, vein.name),
          unload: target => api.drone_unload(name, target.pos),
        })
      })
    }`].join('\n')
}
