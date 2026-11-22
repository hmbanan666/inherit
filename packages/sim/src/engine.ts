import { dispatch, advanceTrips } from './freight'
import type { Factory, MaterialItem, FactoryEvent, RecipeId } from './packs/workshop/campaign-api'
import { MACHINES, RECIPES, machineRecipes } from './packs/workshop/catalog'
import type { CampaignMachine, CampaignWorld } from './packs/workshop/model'
import { markDefect, work, finishProduction } from './packs/workshop/production'
import { emit, feed, moveBelts, openIncident, produce } from './packs/workshop/transport'

function checkFurnaceInput(machine: CampaignMachine, recipe: RecipeId | undefined, beat: number) {
  if (beat < 4 || machine.kind !== 'furnace' || machine.fault || !recipe) return
  const ore = machine.queue[0]?.kind
  if (
    (recipe === 'iron-ingot' && ore === 'copper-ore') ||
    (recipe === 'copper-ingot' && ore === 'iron-ore')
  ) {
    machine.fault = 'jammed'
    machine.status = 'blocked'
  }
}

export function stepCampaign(
  world: CampaignWorld,
  onTick: (ctx: Factory, events: FactoryEvent[]) => void,
  beat = 0,
) {
  const findMachine = (id: string) => world.machines.find((m) => m.id === id)
  const previous = world.lastEvents
  world.lastEvents = []
  world.tick++
  const active = new Set(world.machines.filter((machine) => machine.status === 'working'))
  for (const machine of world.machines) {
    if (machine.coolAt && world.tick >= machine.coolAt) {
      machine.status = 'idle'
      delete machine.fault
      delete machine.coolAt
      delete machine.repairing
    }
    machine.status = machine.fault ? 'blocked' : 'idle'
  }
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
      const {
        lastInput,
        recentProduction,
        batchDefect,
        builtAt,
        builtByCode,
        paid,
        batchTicks,
        fault,
        heat,
        heatLimit,
        coolAt,
        repairing,
        ...view
      } = machine
      return structuredClone({ ...view, status: machine.fault ?? machine.status })
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
    dig(id, mode) {
      const machine = findMachine(id)
      if (!machine || machine.kind !== 'miner' || !machine.deposit || dug.has(id)) return false
      const output = belt(id)
      if (mode === 'wait-for-space' && output?.items.some((item) => item.position === 0)) return false
      dug.add(id)
      const item: MaterialItem = {
        kind: machine.deposit === 'coal' ? 'coal' : machine.deposit === 'iron' ? 'iron-ore' : 'copper-ore',
      }
      if (beat >= 4 && id === 'mine') {
        world.seed = (Math.imul(1664525, world.seed) + 1013904223) >>> 0
        if (world.seed % 3 === 0) item.kind = 'copper-ore'
      }
      if (!feed(output, markDefect(world, item))) {
        if (!output && mode === 'wait-for-space')
          world.extracted[item.kind] = (world.extracted[item.kind] ?? 0) + 1
        machine.status = 'blocked'
        world.lost++
        return false
      }
      produce(world, machine)
      world.extracted[item.kind] = (world.extracted[item.kind] ?? 0) + 1
      return true
    },
    work(id, recipe) {
      const m = findMachine(id)
      if (!m) return false
      checkFurnaceInput(m, recipe ?? m.recipe, beat)
      if (m.fault) return false
      return work(m, recipe)
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
      checkFurnaceInput(machine, machine.recipe, beat)
      if (!machine.fault) {
        finishProduction(world, machine)
        if (beat >= 6 && machine.kind === 'furnace') {
          machine.heat =
            machine.status === 'working' ? (machine.heat ?? 0) + 1 : Math.max(0, (machine.heat ?? 0) - 1)
          machine.heatLimit ??= 180 + ((world.seed + machine.builtAt) % 100)
          if (machine.heat >= machine.heatLimit) {
            machine.fault = 'broken'
            machine.status = 'blocked'
            machine.heat = 0
            machine.coolAt = world.tick + 240
          }
        }
      }
      recordStats(world, machine)
    }
    for (const machine of world.machines) {
      if (active.has(machine) && machine.status !== 'working')
        emit(world, { type: 'machineIdle', tick: world.tick, machineId: machine.id })
    }
    world.events = world.events.concat(world.lastEvents).slice(-256)
  }
}
export function recordStats(world: CampaignWorld, machine: CampaignMachine) {
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
