import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'

export function finishBatch(world: World, site: Site) {
  if (world.furnace.readyAt !== world.tick) return
  world.furnace.output += site.recipe.ingots
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
        smelt: api.furnace_smelt
      })`,
    }),
    brick('furnace.input', 'readonly input: number', 'Ore waiting to smelt.', 'furnace.input', read,
      ({ world }) => world.furnace.input),
    brick('furnace.output', 'readonly output: number', 'Ingots ready to ship.', 'furnace.output', read,
      ({ world }) => world.furnace.output),
    brick('furnace.smelt', 'smelt(): void', `Start a batch. Calling with too little ore wastes ${site.recipe.fuel} credit of the next payout.`, 'furnace.smelt()', action,
      ({ world }) => {
        const furnace = world.furnace
        if (furnace.input < site.recipe.ore) {
          world.ledger.waste += site.recipe.fuel
          world.status = `The furnace burns fuel while empty: you lose ${site.recipe.fuel} credit of output per call. Smelt only when it has ${site.recipe.ore} ore.`
          return
        }
        if (furnace.readyAt !== null) return
        furnace.input -= site.recipe.ore
        furnace.readyAt = world.tick + site.recipe.ticks
      }),
  ]
}
