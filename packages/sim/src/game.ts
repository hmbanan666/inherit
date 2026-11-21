import { blueprintCommands } from './blueprints'
import { affectedOrders } from './incidents'
import type { Campaign, Incident, OrderState, StoryMessage, JsonObject } from './model'
import type { BlueprintAPI, Factory, FactoryEvent } from './campaign-api'
import { getSurface, type GameEventName } from './research'
import { advanceCampaign } from './quests'
import { beginObjective, finishObjective, objectiveTrack } from './objectives'
import { offerMotorOrder, openBoard, settleOrders } from './orders'
import { binderNudge, postMessage } from './story'

export interface GameTick {
  completed: string[]
  newMessages: StoryMessage[]
  orderUpdates: OrderState[]
  moneyDelta: number
  incidents: Incident[]
}
export type GameFactory = Pick<Factory, 'tick' | 'dig' | 'work' | 'space'> &
  Partial<Omit<Factory, 'recipe'> & BlueprintAPI>
export interface GameProgram {
  onTick(ctx: GameFactory): void
  deliverEvent(name: GameEventName, event: FactoryEvent, ctx: GameFactory): void
  exportMemory(): JsonObject
}
export type GameController = ((ctx: GameFactory, events: FactoryEvent[]) => void) | GameProgram
const handlers: Partial<Record<FactoryEvent['type'], GameEventName>> = {
  itemArrived: 'onItemArrived',
  machineIdle: 'onMachineIdle',
  truckReturned: 'onTruckReturned',
}
function recordFreight(c: Campaign) {
  const signals = c.progress.signals
  for (const event of c.world.lastEvents) {
    if (event.type !== 'truckReturned') continue
    if (event.outcome === 'breakdown') {
      signals.breakdown = true
      signals.brokenKey = event.key
    } else {
      if (event.key === signals.brokenKey) signals.recovered = true
      if (event.outcome === 'lostAck') signals.missingKey = event.key
      else if (signals.missingKey === event.key) signals.confirmed = true
    }
  }
}
function runController(
  c: Campaign,
  controller: GameController,
  factory: Factory,
  previous: FactoryEvent[],
  surface: ReturnType<typeof getSurface>,
) {
  const events = previous.filter((e) => {
    const handler = handlers[e.type]
    return handler && surface.events.includes(handler)
  })
  const ctx: GameFactory = { tick: factory.tick, dig: factory.dig, space: factory.space, work: factory.work }
  const available = { ...factory, ...(surface.methods.includes('build') ? blueprintCommands(c) : {}) }
  for (const key of surface.methods) Object.assign(ctx, { [key]: available[key] })
  const signals = c.progress.signals
  let ringing: FactoryEvent | undefined
  if (!signals.choseRecipe || (!signals.arrival && events.some((e) => e.type === 'itemArrived'))) {
    ctx.work = (id, recipe) => {
      const started = factory.work(id, recipe)
      if (recipe === 'bracket' && c.world.machines.some((m) => m.id === id && m.recipe === recipe))
        signals.choseRecipe = true
      const atArrival =
        typeof controller === 'function'
          ? events.some((e) => e.type === 'itemArrived' && e.machineId === id)
          : ringing?.type === 'itemArrived' && ringing.machineId === id
      if (
        started &&
        atArrival &&
        Object.values(c.project.deployed).some((source) => /\bonItemArrived\b/.test(source))
      )
        signals.arrival = true
      return started
    }
  }
  if (ctx.peek && !signals.inspectedParcel) {
    ctx.peek = (id) => {
      const parcel = factory.peek(id)
      if (parcel && c.world.machines.some((m) => m.id === id && m.kind === 'sorter'))
        signals.inspectedParcel = true
      return parcel
    }
  }
  if (typeof controller === 'function') controller(ctx, events)
  else {
    try {
      for (const event of events) {
        ringing = event
        controller.deliverEvent(handlers[event.type]!, event, ctx)
      }
      ringing = undefined
      controller.onTick(ctx)
    } finally {
      c.memory = controller.exportMemory()
    }
  }
  if (
    !signals.idle &&
    events.some((e) => e.type === 'machineIdle' && Object.values(c.memory).includes(e.machineId))
  )
    signals.idle = true
}
/** Advance the physical floor and settle every effect once, including on a controller error. */
export function advanceGame(c: Campaign, controller: GameController): GameTick {
  if (!c.progress.objectiveRun) beginObjective(c)
  const money = c.economy.money
  const surface = getSurface(c)
  const accepted = c.economy.orders.filter((o) => o.status === 'accepted')
  const result: GameTick = { completed: [], newMessages: [], orderUpdates: [], moneyDelta: 0, incidents: [] }
  try {
    advanceCampaign(
      c,
      (factory, previous) => {
        runController(c, controller, factory, previous, surface)
      },
      false,
    )
  } finally {
    recordFreight(c)
    for (const incident of c.world.incidents) {
      if (incident.startTick === c.world.tick)
        incident.affectedOrders = affectedOrders(c.world, incident, accepted)
      if (incident.startTick === c.world.tick || incident.endTick === c.world.tick)
        result.incidents.push(incident)
    }
    result.orderUpdates.push(...settleOrders(c))
    const finished = finishObjective(c)
    if (finished) {
      result.completed.push(finished.id)
      if (finished.story) {
        const msg = postMessage(c, finished.story)
        if (msg) result.newMessages.push(msg)
      }
    }
    if (objectiveTrack(c).active?.id === 'tram') {
      const ticket = offerMotorOrder(c)
      if (ticket) result.orderUpdates.push(ticket)
    }
    result.orderUpdates.push(...openBoard(c))
    const nudge = binderNudge(c)
    if (nudge) result.newMessages.push(nudge)
    result.moneyDelta = c.economy.money - money
  }
  return structuredClone(result)
}
