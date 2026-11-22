import type { MaterialItem } from './campaign-api'
import { RECIPES, type Recipe } from './catalog'
import type { CampaignMachine, CampaignWorld } from './model'
import { emit, feed, produce } from './transport'

export function markDefect(world: CampaignWorld, item: MaterialItem) {
  if (world.defectsEnabled) {
    world.seed = (Math.imul(1664525, world.seed) + 1013904223) >>> 0
    if (world.seed % 13 === 0) item.defect = true
  }
  return item
}
function ingredients(queue: MaterialItem[], recipe: Recipe): number[] | undefined {
  if (recipe.defectiveInput) {
    const index = queue.findIndex((i) => i.defect)
    return index >= 0 ? [index] : undefined
  }
  const indices: number[] = []
  for (const [kind, count] of Object.entries(recipe.inputs)) {
    let needed = count
    for (let i = 0; i < queue.length && needed; i++) {
      if (queue[i].kind === kind) {
        indices.push(i)
        needed--
      }
    }
    if (needed) return
  }
  return indices.sort((a, b) => b - a)
}
export function work(machine: CampaignMachine | undefined, id = machine?.recipe): boolean {
  if (!machine || !id || !Object.hasOwn(RECIPES, id) || machine.remaining || machine.output) return false
  const recipe = RECIPES[id]
  if (recipe.machine !== machine.kind) return false
  machine.recipe = id
  const inputs = ingredients(machine.queue, recipe)
  if (!inputs) return false
  for (const i of inputs) {
    const [item] = machine.queue.splice(i, 1)
    if (item.defect && !recipe.defectiveInput) machine.batchDefect = true
  }
  machine.remaining = machine.batchTicks ?? recipe.ticks
  return true
}
export function finishProduction(world: CampaignWorld, machine: CampaignMachine) {
  if (machine.kind === 'dock') {
    if (machine.queue.length && world.tick % world.dockInterval === 0) {
      const item = machine.queue.shift()!
      world.delivered[item.kind] = (world.delivered[item.kind] ?? 0) + 1
      emit(world, { type: 'delivered', tick: world.tick, machineId: machine.id, item })
      produce(world, machine)
    } else if (machine.queue.length) machine.status = 'ready'
    return
  }
  if (!machine.recipe) return
  const recipe = RECIPES[machine.recipe]
  if (machine.remaining) {
    machine.status = 'working'
    if (--machine.remaining === 0) {
      const item: MaterialItem = { kind: recipe.output }
      if (machine.batchDefect) item.defect = true
      machine.output = recipe.defectiveInput ? item : markDefect(world, item)
      delete machine.batchDefect
      produce(world, machine)
    }
  } else machine.status = ingredients(machine.queue, recipe) ? 'ready' : 'starved'
  if (machine.output) {
    if (
      feed(
        world.belts.find((b) => b.from === machine.id),
        machine.output,
      )
    )
      delete machine.output
    else machine.status = 'blocked'
  }
}
