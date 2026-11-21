import { blueprintCommands } from './blueprints'
import { stepCampaign } from './engine'
import type { Campaign, Incident, OrderState, StoryMessage, JsonObject } from './model'
import type { BlueprintAPI, Factory, FactoryEvent } from './campaign-api'
import { getSurface, type GameEventName } from './research'
import { letter, settleTown } from './town'

export interface GameTick {
  completed: string[]
  newMessages: StoryMessage[]
  orderUpdates: OrderState[]
  moneyDelta: number
  incidents: Incident[]
}
export type GameFactory = Omit<Factory, 'recipe' | 'dispatch'> & BlueprintAPI
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
/** Settle shipments even when a controller stops partway through a tick. */
export function advanceGame(c: Campaign, controller: GameController): GameTick {
  const money = c.economy.money,
    messages = c.progress.messages.length,
    changes = c.town.changes.length
  const surface = getSurface(c)
  try {
    stepCampaign(
      c.world,
      (floor, previous) => {
        const ctx = { ...floor, ...blueprintCommands(c) }
        const { dispatch: _dispatch, recipe: _recipe, ...player } = ctx
        const events = previous.filter((e) => surface.events.includes(handlers[e.type]!))
        if (typeof controller === 'function') controller(player, events)
        else {
          try {
            for (const e of events) controller.deliverEvent(handlers[e.type]!, e, player)
            controller.onTick(player)
          } finally {
            c.memory = controller.exportMemory()
          }
        }
      },
      c.town.beat,
    )
  } finally {
    if (c.world.machines.some((m) => m.fault === 'jammed'))
      letter(
        c,
        'jam',
        'Bram',
        'A furnace jammed',
        'Dump the jammed bin with ctx.clear(id), then route copper to a copper furnace.',
      )
    settleTown(c)
  }
  return {
    completed: c.town.changes.slice(changes).map((change) => change.buildingId),
    newMessages: c.progress.messages.slice(messages),
    moneyDelta: c.economy.money - money,
    orderUpdates: [],
    incidents: [],
  }
}
