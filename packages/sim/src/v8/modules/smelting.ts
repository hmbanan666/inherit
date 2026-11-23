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
    brick('furnace.smelt', 'smelt(): void', `Start a batch. Every call burns ${site.recipe.fuel} cr.`, 'furnace.smelt()', action,
      ({ world }) => {
        world.credits -= site.recipe.fuel
        world.ledger.fuel += site.recipe.fuel
        const furnace = world.furnace
        if (furnace.input < site.recipe.ore)
          world.status = `The furnace burns fuel while empty (-${site.recipe.fuel} cr per call). Smelt only when it has ${site.recipe.ore} ore.`
        if (furnace.readyAt !== null || furnace.input < site.recipe.ore) return
        furnace.input -= site.recipe.ore
        furnace.readyAt = world.tick + site.recipe.ticks
      }),
  ]
}
