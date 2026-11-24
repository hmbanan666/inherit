import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'
import { functionUnlocked, questList, unlockError } from '../quests'
import { alloyRecipe, ensureBin, furnaceFullMessage, furnaceOutputCap, furnaceRecipeType, release, releaseTransfer, smeltRecipe, startRecipe } from './stock'

export const outputCap = furnaceOutputCap

const steelNote = 'smelt() makes ingots. Steel comes from furnace.alloy().'

function noteSteel(world: World) {
  const quest = questList.find(item => item.id === world.questId)
  if (quest?.item !== 'steel') return
  const list = (world.console ??= [])
  const prior = list.find(line => line.text === steelNote)
  if (prior) {
    prior.count = (prior.count ?? 1) + 1
    prior.tick = world.tick
    return
  }
  list.push({ seq: (list.at(-1)?.seq ?? 0) + 1, tick: world.tick, text: steelNote, level: 'info', count: 1 })
}

export function finishBatch(world: World, site: Site) {
  if (world.furnace.readyAt !== world.tick) return
  const steel = world.furnace.batch === 'steel'
  const qty = steel ? alloyRecipe.qty : site.recipe.ingots
  world.furnace.bin = ensureBin(world.furnace.bin)
  release(world.furnace.bin.reservedIn, steel ? 'steel' : 'ingot', qty)
  if (steel) {
    world.furnace.steel += qty
    world.steelMade += 1
  } else {
    world.furnace.output += qty
    world.ingotsMade += 1
  }
  world.furnace.batch = null
  world.furnace.readyAt = null
}

function beginFurnace(world: World, id: string) {
  if (id === alloyRecipe.id && !functionUnlocked(world, 'furnace.alloy')) throw new Error(unlockError('furnace.alloy'))
  const result = startRecipe(world, 'furnace', id)
  if (result === 'full') throw new Error(furnaceFullMessage(id === alloyRecipe.id ? 'steel' : 'ingot'))
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
        get inputMax() { return api.furnace_inputMax() },
        get coalMax() { return api.furnace_coalMax() },
        smelt: api.furnace_smelt,
        alloy: api.furnace_alloy,
        start: api.furnace_start,
        clear: api.furnace_clear
      })`,
    }),
    brick('furnace.input', 'readonly input: number', 'Ore waiting to smelt.', 'furnace.input', read,
      ({ world }) => world.furnace.input),
    brick('furnace.output', 'readonly output: number', 'Ingots waiting in the furnace.', 'furnace.output', read,
      ({ world }) => world.furnace.output),
    brick('furnace.coal', 'readonly coal: number', 'Coal waiting to alloy.', 'furnace.coal', read, ({ world }) => world.furnace.coal),
    brick('furnace.inputMax', 'readonly inputMax: number', 'Ore the hopper can hold.', 'furnace.inputMax', read, ({ world }) => world.furnace.oreMax ?? 6),
    brick('furnace.coalMax', 'readonly coalMax: number', 'Coal the hopper can hold.', 'furnace.coalMax', read, ({ world }) => world.furnace.coalMax ?? 3),
    brick('furnace.steel', 'readonly steel: number', 'Steel waiting in the furnace.', 'furnace.steel', read, ({ world }) => world.furnace.steel),
    brick('furnace.clear', 'clear(): void', 'Drop ore and coal from the hopper. Ingots and steel stay.', 'furnace.clear()', action, ({ world }) => {
      world.furnace.bin = ensureBin(world.furnace.bin)
      for (const drone of world.drones) {
        const task = drone.task
        if (task?.kind === 'transfer' && task.from === 'furnace' && (task.item === 'ore' || task.item === 'coal')) {
          releaseTransfer(world, drone)
          drone.task = null
          drone.route = undefined
        }
      }
      world.furnace.input = 0
      world.furnace.coal = 0
      release(world.furnace.bin.reservedOut, 'ore', world.furnace.bin.reservedOut.ore ?? 0)
      release(world.furnace.bin.reservedOut, 'coal', world.furnace.bin.reservedOut.coal ?? 0)
      release(world.furnace.bin.reservedIn, 'ore', world.furnace.bin.reservedIn.ore ?? 0)
      release(world.furnace.bin.reservedIn, 'coal', world.furnace.bin.reservedIn.coal ?? 0)
    }),
    brick('furnace.smelt', 'smelt(): void', 'Start smelting 2 ore into 1 ingot. The furnace finishes the batch on its own.', `// The hopper needs 2 ore. This starts one ingot.\nfurnace.smelt()`, action, ({ world }) => {
      noteSteel(world)
      beginFurnace(world, smeltRecipe.id)
    }),
    brick('furnace.alloy', 'alloy(): void', 'Start alloying 2 ore and 1 coal into 1 steel. The furnace finishes the batch on its own.', `// 2 ore and 1 coal in the hopper become 1 steel.\nfurnace.alloy()`, action, ({ world }) => {
      beginFurnace(world, alloyRecipe.id)
    }),
    brick('furnace.start', `start(recipe: ${furnaceRecipeType}): void`, 'Start a furnace batch. smelt() and alloy() call this. The furnace finishes it on its own.', `// Same batch as smelt().\nfurnace.start("smelt")`, action, ({ world }, id) => {
      beginFurnace(world, String(id))
    }),
  ]
}
