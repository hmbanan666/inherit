export * from './core/world'
export * from './core/bricks'
export { mining, miningModule, dumpCargo } from './modules/mining'
export { kettlewick, uncleMain } from './sites/kettlewick'
export { questList, shop, shopTiers, acceptQuest, completeQuest, buyUpgrade, nextQuest, nextUnlock, upcomingQuests, levelFor, levelSpan, functionUnlocked, freshBrick, triggerUnlocked, unlockError } from './quests'
export { outputCap } from './modules/smelting'
export {
  worksEvents, onApi, pressManual, queueRun, grantLegacy, ensureTriggers, actManual, dueEvents, settleTriggers,
  type ManualAction,
  inspectMachine, machineList, snapshotSignals,
} from './triggers'
export { readChecks, inspectAt, noteCheckReset, stallTicks } from './checkFacts'

import type { Brick } from './core/bricks'
import { mining, miningModule } from './modules/mining'
import { orderBricks } from './modules/orders'
import { smelting } from './modules/smelting'
import type { Site } from './core/world'

export function factoryBricks(site: Site) {
  return [...mining(site), ...smelting(site), ...orderBricks(site)]
}

export function factoryModule(bricks: Brick[]) {
  return miningModule(bricks) + `
const listeners = Object.create(null)
export function on(event, fn) {
  api.triggers_allow()
  if (typeof fn !== "function") throw new Error("on() needs a function.")
  const known = ["furnace.full", "furnace.ready", "drone.idle", "drone.full"]
  if (known.indexOf(event) < 0) throw new Error("Unknown event " + event + ".")
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(fn)
}
globalThis.__inheritEmit = function (event) {
  const list = listeners[event]
  if (!list) return
  for (let i = 0; i < list.length; i++) list[i]()
}
export const { orders, ship, credits, prospect } = api
`
}
