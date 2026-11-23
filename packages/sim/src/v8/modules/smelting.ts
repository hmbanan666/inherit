import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'

export function finishBatch(world: World, site: Site) {
  if (world.furnace.readyAt !== world.tick) return
  if (world.furnace.batch === 'steel') {
    world.furnace.steel += 1
    world.steelMade += 1
  } else {
    world.furnace.output += site.recipe.ingots
    world.ingotsMade += 1
  }
  world.furnace.batch = null
  world.furnace.readyAt = null
}

export function smelting(site: Site): Brick[] {
  const { read, action } = site.costs
  return [
    brick('furnace', 'const furnace: Furnace', 'Smelt ore here.', 'drone.unload(furnace)', read, {
      guest: `export const furnace = Object.freeze({
        pos: Object.freeze(${JSON.stringify(site.furnace.pos)}),
        get input() { return api.furnace_input() },
        get output() { return api.furnace_output() },
        get coal() { return api.furnace_coal() },
        get steel() { return api.furnace_steel() },
        smelt: api.furnace_smelt,
        alloy: api.furnace_alloy
      })`,
    }),
    brick('furnace.input', 'readonly input: number', 'Ore waiting to smelt.', 'furnace.input', read,
      ({ world }) => world.furnace.input),
    brick('furnace.output', 'readonly output: number', 'Ingots ready to ship.', 'furnace.output', read,
      ({ world }) => world.furnace.output),
    brick('furnace.coal', 'readonly coal: number', 'Coal waiting to alloy.', 'furnace.coal', read, ({ world }) => world.furnace.coal),
    brick('furnace.steel', 'readonly steel: number', 'Steel ready to ship.', 'furnace.steel', read, ({ world }) => world.furnace.steel),
    brick('furnace.smelt', 'smelt(): void', 'Smelt 2 ore into 1 ingot.', 'furnace.smelt()', action, ({ world }) => {
      const furnace = world.furnace
      if (furnace.readyAt !== null) return
      if (furnace.input < site.recipe.ore) {
        world.ledger.waste += site.recipe.fuel
        return
      }
      furnace.input -= site.recipe.ore
      furnace.batch = 'ingot'
      furnace.readyAt = world.tick + (world.batchTicks ?? site.recipe.ticks)
    }),
    brick('furnace.alloy', 'alloy(): void', 'Alloy 2 ore and 1 coal into 1 steel. Sold in the shop.', 'furnace.alloy()', action, ({ world }) => {
      if (!world.bought.includes('alloy')) throw new Error('Alloy is in the shop.')
      const furnace = world.furnace
      if (furnace.readyAt !== null) return
      if (furnace.input < site.recipe.ore || furnace.coal < 1) {
        world.ledger.waste += site.recipe.fuel
        return
      }
      furnace.input -= site.recipe.ore
      furnace.coal -= 1
      furnace.batch = 'steel'
      furnace.readyAt = world.tick + (world.batchTicks ?? site.recipe.ticks)
    }),
  ]
}
