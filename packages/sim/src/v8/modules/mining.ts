import { brick, type Brick, type TickContext } from '../core/bricks'
import type { Cell, Site, World } from '../core/world'

function cell(world: World, input: unknown): Cell {
  const value = input as Partial<Cell> | null
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number' ||
    !Number.isInteger(value.x) || !Number.isInteger(value.y) ||
    value.x < 0 || value.x >= world.grid.width || value.y < 0 || value.y >= world.grid.height)
    throw new Error('Choose a cell on the map.')
  return { x: value.x, y: value.y }
}

function distance(a: Cell, b: Cell) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) }

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
  return path
}

function drone(world: World, name: unknown) {
  const found = world.drones.find(d => d.name === name)
  if (!found) throw new Error('Choose a drone from drones().')
  return found
}

function bindings(site: Site): Brick[] {
  const binding = (name: string, signature: string, doc: string, example: string, guest: string): Brick =>
    ({ name, signature, doc, example, since: '1.0', cost: site.costs.read, handler: { guest } })
  return [
    binding('tick', 'const tick: number', 'Current tick.', 'tick', 'export let tick = 0; state.clock(value => { tick = value })'),
    binding('memory', 'const memory: Record<string, any>', 'Data kept between ticks.', 'memory.route', 'export const memory = state.memory'),
    binding('cpu.limit', 'readonly limit: number', 'CPU available per tick.', 'cpu.limit', `const cpuLimit = ${site.cpuLimit}`),
    binding('depot', 'const depot: Target', 'Unload ore here.', 'drone.unload(depot)', `export const depot = Object.freeze({ pos: Object.freeze(${JSON.stringify(site.depot.pos)}) })`),
  ]
}

export function mining(site: Site): Brick[] {
  const { read, action } = site.costs
  return [
    ...bindings(site),
    brick('cpu.used', 'used(): number', 'CPU spent this tick.', 'cpu.used()', read, ctx => ctx.cpuUsed()),
    brick('drones', 'function drones(): Drone[]', 'Read your drones.', 'drones()[0]', read, ctx => ctx.world.drones),
    brick('veins', 'function veins(): Vein[]', 'Read the known veins.', 'veins()[0]', read, ctx => ctx.world.veins),
    brick('findPath', 'function findPath(from: Cell, to: Cell): Cell[]', 'Cells to walk from here to the target.',
      'findPath(drone.pos, depot.pos)', site.costs.findPath, findPath),
    brick('drone.isNear', 'isNear(target: Target): boolean', 'Within one cell of a target.', 'drone.isNear(depot)', read,
      ({ world }, name, pos) => distance(drone(world, name).pos, cell(world, pos)) <= 1),
    brick('drone.moveAlong', 'moveAlong(path: Cell[]): void', 'Walk one step along a saved route.',
      'drone.moveAlong(memory.route)', action, (ctx, name, path) => {
        const d = drone(ctx.world, name)
        if (!Array.isArray(path)) throw new Error('Give moveAlong a path from findPath.')
        const index = path.findIndex(p => distance(cell(ctx.world, p), d.pos) === 0)
        const next = path[index + 1]
        if (!next) return
        const pos = cell(ctx.world, next)
        if (distance(d.pos, pos) !== 1) throw new Error('The next path cell must be one step away.')
        d.pos = pos
      }),
    brick('drone.mine', 'mine(vein: Vein): void', 'Take nearby ore into cargo.', 'drone.mine(veins()[0])', action,
      (ctx, name, veinName) => {
        const d = drone(ctx.world, name)
        const vein = ctx.world.veins.find(v => v.name === veinName)
        if (!vein || distance(d.pos, vein.pos) > 1) throw new Error('Move next to the vein first.')
        if (!vein.left) throw new Error('Vein ' + vein.name + ' is empty.')
        const amount = Math.min(site.orePerMine, vein.left, d.capacity - d.cargo)
        vein.left -= amount
        d.cargo += amount
      }),
    brick('drone.unload', 'unload(station: Target): void', 'Leave cargo at a nearby depot or furnace.', 'drone.unload(depot)', action,
      (ctx, name, target) => {
        const d = drone(ctx.world, name), { depot, furnace } = ctx.world
        const pos = cell(ctx.world, target)
        if (distance(d.pos, pos) > 1) throw new Error('Move next to the station to unload.')
        if (distance(pos, furnace.pos) === 0) furnace.input += d.cargo
        else if (distance(pos, depot.pos) === 0) depot.ore += d.cargo
        else throw new Error('Choose the furnace or depot to unload.')
        d.cargo = 0
      }),
  ]
}

// The guest facade binds a drone's identity to its methods. Only bounded JSON
// crosses the sandbox bridge; entity lookup and all mutations happen above.
export function miningModule(bricks: Brick[]) {
  const source = bricks.flatMap(b => typeof b.handler === 'object' ? [b.handler.guest] : [])
  return [...source, `
    export const cpu = Object.freeze({ used: api.cpu_used, limit: cpuLimit })
    export const veins = api.veins, findPath = api.findPath
    export function drones() {
      return api.drones().map(d => {
        const name = d.name
        return Object.assign(d, {
          moveAlong: path => api.drone_moveAlong(name, path),
          isNear: target => api.drone_isNear(name, target.pos),
          mine: vein => api.drone_mine(name, vein.name),
          unload: target => api.drone_unload(name, target.pos),
        })
      })
    }`].join('\n')
}
