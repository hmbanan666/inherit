import { dispatch, advanceTrips } from './freight'
import type { Factory, MaterialItem, FactoryEvent } from './campaign-api'
import { MACHINES, RECIPES, machineRecipes } from './catalog'
import type { CampaignMachine, CampaignWorld } from './model'
import { markDefect, work, finishProduction } from './production'
import { emit, feed, moveBelts, openIncident, produce } from './transport'

export function stepCampaign(world: CampaignWorld, onTick: (ctx: Factory, events: FactoryEvent[]) => void) {
  const findMachine = (id: string) => world.machines.find((m) => m.id === id)
  const previous = world.lastEvents
  world.lastEvents = []
  world.tick++
  const active = new Set(world.machines.filter((machine) => machine.status === 'working'))
  for (const machine of world.machines) machine.status = 'idle'
  moveBelts(world, new Map(world.machines.map((m) => [m.id, m])))
  const belt = (id: string, to?: string) =>
    world.belts.find((b) => b.from === id && (to === undefined || b.to === to))
  const dug = new Set<string>()
  const ctx: Factory = {
    tick: world.tick,
    machines(kind) {
      return world.machines.filter((machine) => !kind || machine.kind === kind).map((machine) => machine.id)
    },
    inspect(id) {
      const machine = findMachine(id)
      if (!machine) return
      const { lastInput, recentProduction, batchDefect, builtAt, builtByCode, paid, batchTicks, ...view } =
        machine
      return structuredClone(view)
    },
    recipe(id) {
      return Object.hasOwn(RECIPES, id) ? structuredClone(RECIPES[id]) : undefined
    },
    recipes(id) {
      const machine = findMachine(id)
      return machine ? machineRecipes(machine.kind) : []
    },
    peek(id) {
      const item = findMachine(id)?.queue[0]
      return item && { ...item }
    },
    dig(id) {
      const machine = findMachine(id)
      if (!machine || machine.kind !== 'miner' || !machine.deposit || dug.has(id)) return false
      dug.add(id)
      const item: MaterialItem = {
        kind: machine.deposit === 'coal' ? 'coal' : machine.deposit === 'iron' ? 'iron-ore' : 'copper-ore',
      }
      if (!feed(belt(id), markDefect(world, item))) {
        machine.status = 'blocked'
        world.lost++
        return false
      }
      produce(world, machine)
      world.extracted[item.kind] = (world.extracted[item.kind] ?? 0) + 1
      return true
    },
    work(id, recipe) {
      return work(findMachine(id), recipe)
    },
    stock(id, kind) {
      const material = kind === 'ore' ? 'iron-ore' : kind === 'ingot' ? 'iron-ingot' : kind
      return findMachine(id)?.queue.filter((i) => !material || i.kind === material).length ?? 0
    },
    space(id, target) {
      const b = belt(id, target)
      return !!b && !b.items.some((i) => i.position === 0)
    },
    route(id, to) {
      const machine = findMachine(id)
      if (!machine || !MACHINES[machine.kind].routes || !machine.queue.length) return false
      if (!feed(belt(id, to), machine.queue[0])) {
        machine.status = 'blocked'
        return false
      }
      machine.queue.shift()
      produce(world, machine)
      return true
    },
    dispatch(truck, from, to, key) {
      return dispatch(world, findMachine, truck, from, to, key)
    },
  }
  try {
    onTick(ctx, structuredClone(previous))
  } finally {
    advanceTrips(world, findMachine)
    for (const machine of world.machines) {
      finishProduction(world, machine)
      recordStats(world, machine)
    }
    for (const machine of world.machines) {
      if (active.has(machine) && machine.status !== 'working')
        emit(world, { type: 'machineIdle', tick: world.tick, machineId: machine.id })
    }
    world.events = world.events.concat(world.lastEvents).slice(-256)
  }
}
function recordStats(world: CampaignWorld, machine: CampaignMachine) {
  const stats = machine.stats
  if (machine.status === 'working') stats.activeTicks++
  else if (machine.status === 'blocked') stats.blockedTicks++
  else stats.idleTicks++
  machine.recentProduction = machine.recentProduction.filter((t) => t > world.tick - 240)
  const sampledTicks = stats.activeTicks + stats.idleTicks + stats.blockedTicks
  stats.rate = Math.round((machine.recentProduction.length * 240) / Math.min(240, sampledTicks))
  if (machine.status === 'blocked') openIncident(world, machine.id, 'blocked')
  else {
    const incident = world.incidents.find(
      (i) => i.cause === 'blocked' && i.machineId === machine.id && i.endTick === undefined,
    )
    if (incident) incident.endTick = world.tick
  }
}
