export * from './core/world'
export * from './core/bricks'
export { mining, miningModule } from './modules/mining'
export { kettlewick } from './sites/kettlewick'
export { questList, shop, shopTiers, acceptQuest, completeQuest, buyUpgrade, nextQuest, nextUnlock, upcomingQuests, levelFor, levelSpan } from './quests'
export { readChecks, inspectAt } from './checkFacts'

import type { Brick } from './core/bricks'
import { mining, miningModule } from './modules/mining'
import { orderBricks } from './modules/orders'
import { smelting } from './modules/smelting'
import type { Site } from './core/world'

export function factoryBricks(site: Site) {
  return [...mining(site), ...smelting(site), ...orderBricks(site)]
}

export function factoryModule(bricks: Brick[]) {
  return miningModule(bricks) + '\nexport const { orders, ship, credits, prospect } = api'
}
