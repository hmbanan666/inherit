import type { Campaign, Incident, OrderState, StoryMessage } from './model'
import { primitiveTick, type ChapterFactory } from './primitives'
import { observeLesson, type CallRecord } from './lesson-flow'
import { settleTown } from './town'

export interface GameTick {
  logs: string[]
  calls: CallRecord[]
  completed: string[]
  newMessages: StoryMessage[]
  orderUpdates: OrderState[]
  moneyDelta: number
  incidents: Incident[]
}
/** A stopped program can still have made visible calls before the failing line. */
export class ChapterRunError extends Error {
  constructor(
    cause: unknown,
    readonly calls: CallRecord[],
    readonly logs: string[],
  ) {
    super(cause instanceof Error ? cause.message : 'Controller stopped.', { cause })
  }
}

export type GameFactory = ChapterFactory
export interface GameProgram {
  onTick(api: GameFactory): void
}
export type GameController = ((api: GameFactory) => void) | GameProgram
/** Settle shipments even when a controller stops partway through a tick. */
export function advanceGame(c: Campaign, controller?: GameController, drainLogs?: () => string[]): GameTick {
  const money = c.economy.money,
    messages = c.progress.messages.length,
    changes = c.town.changes.length
  const tick = primitiveTick(c, controller ? 'tick' : 'idle')
  try {
    if (typeof controller === 'function') controller(tick.api)
    else controller?.onTick(tick.api)
  } catch (cause) {
    throw new ChapterRunError(cause, tick.calls, drainLogs?.() ?? [])
  } finally {
    tick.finish()
    settleTown(c)
  }
  const logs = drainLogs?.() ?? []
  if (controller) c.lesson = observeLesson(c, tick.calls, logs)
  return {
    logs,
    calls: tick.calls,
    completed: c.town.changes.slice(changes).map((change) => change.buildingId),
    newMessages: c.progress.messages.slice(messages),
    moneyDelta: c.economy.money - money,
    orderUpdates: [],
    incidents: [],
  }
}
