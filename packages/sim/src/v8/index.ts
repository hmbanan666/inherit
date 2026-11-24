export * from './core/world'
export * from './core/bricks'
export { mining, miningModule, dumpCargo, stepDroneTasks, cancelDroneTask, orderTransfer } from './modules/mining'
export { kettlewick, uncleMain } from './sites/kettlewick'
export { questList, shop, acceptQuest, completeQuest, buyUpgrade, nextQuest, canTake, questHold, levelFor, levelSpan, functionUnlocked, freshBrick, triggerUnlocked, rewardGranted, rewardFresh, secondDroneUnlocked, syncSecondDrone, syncPress, worksGrants, unlockError, pinLegacyTriggers, repairHarrow } from './quests'
export { outputCap } from './modules/smelting'
export {
  worksEvents, onApi, triggerDocs, pressManual, queueRun, stopScript, setLoop, grantLegacy, ensureTriggers, actManual, dueEvents, settleTriggers,
  type ManualAction,
  inspectMachine, machineList, snapshotSignals,
} from './triggers'
export { readChecks, inspectAt, noteCheckReset, stallTicks } from './checkFacts'
export { apiBook, type ApiEntry, type ApiSection } from './apiBook'

export type { Item } from './modules/stock'

import type { Brick } from './core/bricks'
import { mining, miningModule } from './modules/mining'
import { orderBricks } from './modules/orders'
import { smelting } from './modules/smelting'
import { pressBricks } from './modules/stock'
import type { Site } from './core/world'

export function factoryBricks(site: Site) {
  return [...mining(site), ...smelting(site), ...pressBricks(site), ...orderBricks(site)]
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
  if (listeners[event].indexOf(fn) !== -1) return
  listeners[event].push(fn)
}
globalThis.__inheritEmit = function (event) {
  const list = listeners[event]
  if (!list) return
  for (let i = 0; i < list.length; i++) list[i]()
}
export function ship() {}
export const { orders, credits, prospect } = api
`
}
