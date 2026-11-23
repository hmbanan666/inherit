export * from './core/world'
export * from './core/bricks'
export { mining, miningModule } from './modules/mining'
export { kettlewick } from './sites/kettlewick'

import { mining } from './modules/mining'
import { smelting } from './modules/smelting'
import type { Site } from './core/world'

export function factoryBricks(site: Site) {
  return [...mining(site), ...smelting(site)]
}
