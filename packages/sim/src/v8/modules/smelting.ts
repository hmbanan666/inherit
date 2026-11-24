import { brick, type Brick } from '../core/bricks'
import type { Site, World } from '../core/world'
import { functionUnlocked, questList, unlockError } from '../quests'

export const outputCap = 6

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
        get inputMax() { return api.furnace_inputMax() },
        get coalMax() { return api.furnace_coalMax() },
        smelt: api.furnace_smelt,
        alloy: api.furnace_alloy,
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
      world.furnace.input = 0
      world.furnace.coal = 0
    }),
    brick('furnace.smelt', 'smelt(): void', 'Smelt 2 ore into 1 ingot.', `// The hopper needs 2 ore. This starts one ingot.\nfurnace.smelt()`, action, ({ world }) => {
      noteSteel(world)
      const furnace = world.furnace
      if (furnace.readyAt !== null) return
      if (furnace.output >= outputCap) throw new Error(`furnace output is full (${outputCap}). Carry ingots to the depot.`)
      if (furnace.input < site.recipe.ore) return
      furnace.input -= site.recipe.ore
      furnace.batch = 'ingot'
      furnace.readyAt = world.tick + (world.batchTicks ?? site.recipe.ticks)
    }),
    brick('furnace.alloy', 'alloy(): void', 'Alloy 2 ore and 1 coal into 1 steel.', `// 2 ore and 1 coal in the hopper become 1 steel.\nfurnace.alloy()`, action, ({ world }) => {
      if (!functionUnlocked(world, 'furnace.alloy')) throw new Error(unlockError('furnace.alloy'))
      const furnace = world.furnace
      if (furnace.readyAt !== null) return
      if (furnace.steel >= outputCap) throw new Error(`furnace steel is full (${outputCap}). Carry steel to the depot.`)
      if (furnace.input < site.recipe.ore || furnace.coal < 1) return
      furnace.input -= site.recipe.ore
      furnace.coal -= 1
      furnace.batch = 'steel'
      furnace.readyAt = world.tick + (world.batchTicks ?? site.recipe.ticks)
    }),
  ]
}
