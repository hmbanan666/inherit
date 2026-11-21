import type { Campaign, Incident, OrderState, StoryMessage, JsonObject } from './model'
import { primitiveTick, type ChapterFactory } from './primitives'
import { letter, settleTown } from './town'

export interface GameTick {
  completed: string[]
  newMessages: StoryMessage[]
  orderUpdates: OrderState[]
  moneyDelta: number
  incidents: Incident[]
}
export type GameFactory = ChapterFactory
export interface GameProgram {
  onTick(api: GameFactory): void
}
export type GameController = ((api: GameFactory) => void) | GameProgram
/** Settle shipments even when a controller stops partway through a tick. */
export function advanceGame(c: Campaign, controller: GameController): GameTick {
  const money = c.economy.money,
    messages = c.progress.messages.length,
    changes = c.town.changes.length
  const tick = primitiveTick(c)
  try {
    if (typeof controller === 'function') controller(tick.api)
    else controller.onTick(tick.api)
  } finally {
    tick.finish()
    if (c.world.machines.some((m) => m.fault === 'jammed'))
      letter(
        c,
        'jam',
        'Bram',
        'A furnace jammed',
        'Take the stray rock out of the furnace and put it in the matching furnace.',
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
